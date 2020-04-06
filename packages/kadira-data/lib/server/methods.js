Meteor.methods({
  'kadiraData.fetchTraces': function (dataKey, args) {
    check(dataKey, String);
    check(args, Object);
    this.unblock();

    KadiraData._authorize(this.userId, dataKey, args);

    var definition = KadiraData._traceDefinitions[dataKey];
    if (!definition) {
      var message = 'There is no such traceList definition for dataKey: ' + dataKey;
      throw new Meteor.Error('404', message);
    }

    // console.log(definition)
    // console.log(args)
    var query = {};
    if (args.range) {
      // normal list query
      query = _.pick(args, 'appId', 'name', 'host');
      query.appId = { $in: query.appId };
      var range = args.range || 60 * 60 * 1000;
      var resolution = KadiraData._CalculateResolutionForRange(range);
      var resInMillis = KadiraData._ResolutionToMillis(resolution);
      query.startTime = {
        $gte: args.time,
        $lt: new Date(args.time.getTime() + resInMillis)
      };
    } else if (args.query) {
      // directly fetching a single object
      query = args.query;
    }

    console.log(query)

    var newArgs = _.extend(_.clone(args), { query: query });
    var pipes = definition.pipeHandler(newArgs);
    const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
    var coll = db.collection(definition.collection);
    var data = Meteor.wrapAsync(coll.aggregate, coll)(pipes);
    // console.log(data)
    console.log(definition)
    definition.filters.forEach(function (filter) {
      console.log('FOREACH CALL')
      const dt = filter(_.clone(data));
      console.log('forEach', dt)
      data = dt
    });

    return data;
  }
});
