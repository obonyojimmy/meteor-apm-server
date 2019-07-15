import BaseStrategy from './baseStrategy';
import { Operations } from '../operations';

const debug = require('debug')('alertsman:pollingStrategy');

export default class PollingStrategy extends BaseStrategy {
  constructor({ pollingInterval = 5 * 1000 } = {}) {
    super();
    this.cachedAlerts = new Map();
    this.pollingInterval = pollingInterval; // Every 5 sec
    this.alertsCol = Alerts;
  }

  async run() {
    const alerts = await this._getAllAlerts();
    this._populateCache(alerts);
    this._pollingHandler = setInterval(() => this._check(), this.pollingInterval);
  }

  async stop() {
    this.cachedAlerts.clear();
    clearTimeout(this._pollingHandler);
  }

  async _populateCache(alerts) {
    for (const alert of alerts) {
      this.cachedAlerts.set(alert._id, alert);
    }
  }

  async _getAllAlerts() {
    return this.alertsCol.find({}).fetch();
  }

  async _check() {
    debug('checking...');

    const alerts = await this._getAllAlerts();

    for (const alert of alerts) {
      const alertId = alert._id;
      const cachedAlert = this.cachedAlerts.get(alertId);

      //new alert
      if (!cachedAlert) {
        this._emitOperation({ alertId, operation: Operations.Insert });
        continue;
      }

      //alert enabled updated
      if (!!alert.meta.enabled !== !!cachedAlert.meta.enabled) {
        const operation = !!alert.meta.enabled ? Operations.SetEnabled : Operations.SetDisabled;
        this._emitOperation({ alertId, operation });
        continue;
      }

      //lastCheckedDate updated
      const dateWasSet = !!alert.lastCheckedDate && !cachedAlert.lastCheckedDate;
      const dateWasUnset = !alert.lastCheckedDate && !!cachedAlert.lastCheckedDate;
      if (!dateWasUnset &&
        (dateWasSet || alert.lastCheckedDate.getTime() !== cachedAlert.lastCheckedDate.getTime())) {
        this._emitOperation({
          alertId,
          operation: Operations.UpdateLastCheckedDate,
          lastCheckedDate: alert.lastCheckedDate
        });
        continue;
      }

      //very simple, need more efficient solution
      const changed = JSON.stringify(alert) !== JSON.stringify(cachedAlert);

      if (changed) {
        this._emitOperation({ alertId, operation: Operations.Other });
      }
    }

    //check for delete
    const oldIds = this.cachedAlerts.keys();
    for (const oldId of oldIds) {
      if (!alerts.some(({ _id }) => _id === oldId)) {
        this._emitOperation({ alertId: oldId, operation: Operations.Delete });
      }
    }

    //update cache
    this.cachedAlerts.clear();
    this._populateCache(alerts);
  }

  _emitOperation({ alertId, operation, lastCheckedDate }) {
    debug(`alert ${alertId} was handled as '${operation}`);
    this.emit('operation', { alertId, operation, lastCheckedDate });
  }
}
