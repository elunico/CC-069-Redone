class CustomEventTarget extends EventTarget {
  constructor() {
    super();
    this.parentTarget = null;
  }

  dispatchEvent(event) {
    let continues = super.dispatchEvent(event);
    if (continues && this.parentTarget && event.bubbles) {
      // bubble
      this.parentTarget.dispatchEvent(event);
    }
  }
}

