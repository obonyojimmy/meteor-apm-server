import MongoOplog from 'mongo-oplog';
import parseMongoUrl from 'parse-mongo-url';
import BaseStrategy from './baseStrategy';
import { Operations } from '../operations';

export default class OplogStrategy extends BaseStrategy {
  constructor(MONGO_URL, MONGO_OPLOG_URL) {
    super();

    const parsedUrl = parseMongoUrl(MONGO_URL);
    const oplogFilterNs = `${parsedUrl.dbName}.alerts`;
    this._oplog = MongoOplog(MONGO_OPLOG_URL, { ns: oplogFilterNs });
  }

  async run() {
    return this._watchOplog();
  }

  async stop() { }

  _watchOplog() {
    return this._oplog.tail().then(() => {
      this._oplog.on('op', data => {
        let op = {};

        if (data.op === 'i') {
          op.alertId = data.o._id;
          op.operation = Operations.Insert;
        } else if (data.op === 'd') {
          op.alertId = data.o._id;
          op.operation = Operations.Delete;
        } else if (data.op === 'u') {
          op = this._handleUpdate(data);
        }
        this.emit('operation', op);
      });
    });
  }

  _handleUpdate(data) {
    const op = {};

    op.alertId = data.o2._id;
    const update = data.o;

    for (const key of Object.keys(update)) {
      if (key !== '$set') {
        op.operation = Operations.Other;
        break;
      }

      for (const field of Object.keys(update[key])) {
        if (field === 'meta.enabled') {
          if (!!update[key][field]) {
            op.operation = Operations.SetEnabled;
          } else {
            op.operation = Operations.SetDisabled;
          }
        } else if (field === 'lastCheckedDate') {
          op.operation = Operations.UpdateLastCheckedDate;
          op.lastCheckedDate = update[key][field];
        } else {
          op.operation = Operations.Other;
          break;
        }
      }

      break;
    }

    return op;
  }
}
