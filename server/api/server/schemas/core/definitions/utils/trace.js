import zlib from 'zlib';

// Create a promisified inflate function (avoid callbacks)
const inflate = zlib.inflate;

// inflate trace events with 'zlib'
export async function inflateEvents(doc) {
  if (doc && doc.compressed) {
    console.log(doc)
    const inflated = await inflate(Buffer.from(doc.events.buffer));
    doc.events = inflated.toString();
  }
  return doc;
}

export function stringifyStacks(doc) {
  if (typeof doc.stacks !== 'string') {
    doc.stacks = JSON.stringify(doc.stacks);
  }
  return doc;
}
