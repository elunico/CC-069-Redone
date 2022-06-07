
const eventColors = {
  'spawn': '#0f0',
  'reproduce': '#00f',
  'malice': '#f0f',
  'mutate': '#0aa',
  'die': '#f00',
  'invalidate': '#aaa',
  'eat': '#0ff',
  'eaten': '#000'
};

const eventNames = Object.keys(eventColors);

// always double check
window.addEventListener('beforeunload', event => {
  event.preventDefault();
  return event.returnValue = "Are you sure you want to exit?";
});

function saveFile(string, name, kind = 'application/json') {
  let blob = new Blob([string], {
    type: `${kind};charset=utf-8`
  });
  let a = document.createElement('a');
  a.download = name;
  a.href = URL.createObjectURL(blob);
  a.style.opacity = 0;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message);
  }
}

function stringifyEvent(event) {
  return {
    spawn: event => `Spawned object at ${event.detail.position.x}, ${event.detail.position.y}`,
    reproduce: event => `Reproduction event producing ${event.detail.childCount} children`,
    malice: event => `Malice event`,
    mutate: event => `Mutation: ${event.detail.name} from ${event.detail.old} to ${event.detail.current}`,
    die: event => `Death by ${event.detail.cause} at ${event.detail.self.position.x}, ${event.detail.self.position.y}`,
    invalidate: event => `Invalidation of ${event.detail.type.name} at ${event.detail.position.x}, ${event.detail.position.y}`,
    eat: event => `Eating ${event.detail.augment} at ${event.detail.position.x}, ${event.detail.position.y}`,
    eaten: event => `Eaten event at ${event.detail.position.x}, ${event.detail.position.y}`,
  }[event.type](event);
}
