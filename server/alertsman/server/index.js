/* eslint max-len:0 */

import * as urlShortener from './url_shortener';

import AlertsStore from './alerts_store';
import Messenger from './messenger';
import MetricsStore from './metrics/store';
import RuleEngine from './rules/engine';
import TickManager from './tick_manager';
import { processAlone } from './utils';
import OplogStrategy from './watchStrategies/oplog';
import PollingStrategy from './watchStrategies/polling';

const debug = require('debug')('alertsman:index');
const { info, error } = console;

const {
  MONGO_URL,
  MONGO_OPLOG_URL,
  KADIRA_API_URL = 'http://root:secret@localhost:7007/core',
  MAIL_URL,
  TICK_TRIGGER_INTERVAL = 1000 * 10,
  MESSENGER_LOGGING_ONLY,
  GOOGLE_DEV_KEY,
  POLLING_DB_INTERVAL = 1000 * 5
} = process.env;

let alertsStoreStrategy;
if (MONGO_URL && MONGO_OPLOG_URL) {
  alertsStoreStrategy = new OplogStrategy(MONGO_URL, MONGO_OPLOG_URL);
} else if (MONGO_URL) {
  alertsStoreStrategy = new PollingStrategy({ pollingInterval: parseInt(POLLING_DB_INTERVAL, 10) });
} else {
  throw new Error('You must provide at least MONGO_URL env variable');
}

const alertsStore = new AlertsStore(alertsStoreStrategy);

const tickManager = new TickManager({
  triggerInterval: parseInt(TICK_TRIGGER_INTERVAL, 10)
});
const metricsStore = new MetricsStore(KADIRA_API_URL);
const rules = new RuleEngine();
const messenger = new Messenger(MAIL_URL, {
  loggingOnly: Boolean(MESSENGER_LOGGING_ONLY)
});

urlShortener.setGoogleDevKey(GOOGLE_DEV_KEY);

alertsStore
  .on('enabled', alert => tickManager.register(alert))
  .on('disabled', alert => tickManager.unregister(alert));

const handleFire = async alert => {
  const endTime = Date.now();
  const startTime = endTime - 60 * 60 * 1000;

  const data = await metricsStore.getMetrics(alert, startTime, endTime);
  const checkedResult = rules.check(alert, data);
  const armed = alert.isArmed();
  const alertId = alert.getId();
  // XXX: Use moment of a util function to normalize this
  const now = Date.now();
  const diff = now % (1000 * 60);
  const lastCheckedMinute = new Date(now - diff);
  await alertsStore.updateLastCheckedDate(alert, lastCheckedMinute);

  debug(`tick firing success=${checkedResult.success} armed=${armed} id=${alertId}`);
  if (!armed && checkedResult.success) {
    // We don't need to wait until the trigger sends
    // to mark the alert as armed.
    messenger.sendTriggered(alert, checkedResult);
    await alertsStore.setArmed(alert, true);
    console.log('sendTriggered');
    return;
  }

  if (armed && !checkedResult.success) {
    // We don't need to wait until the trigger sends
    // to mark the alert as cleared.
    messenger.sendCleared(alert, checkedResult);
    await alertsStore.setArmed(alert, false);
    console.log('sendCleared');
    return;
  }
};

tickManager.on('fire', async alert => {
  await processAlone(alert, async () => {
    try {
      await handleFire(alert);
    } catch (ex) {
      error(ex.message);
    }
  });
});

alertsStore.load();
info('Kadira Alertsman started');
