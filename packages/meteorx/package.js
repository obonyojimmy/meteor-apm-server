Package.describe({
  "summary": "Exposing Internal Meteor Apis to Hack Meteor",
  "version": "1.4.3",
  "name": "meteorhacks:meteorx"
});

Package.onUse(function (api) {
  api.export("MeteorX");
  api.use([
    "lamhieu:meteorx",
  ]);
});