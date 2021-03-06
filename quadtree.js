// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain

function _typeq_check(type, object) {
  if (type == null) return true;
  else return object instanceof type;
}

class Rectangle {

  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(point) {
    return (point.x >= this.x - this.w &&
      point.x <= this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y <= this.y + this.h);
  }

  intersects(range) {
    return !(range.x - range.w > this.x + this.w ||
      range.x + range.w < this.x - this.w ||
      range.y - range.h > this.y + this.h ||
      range.y + range.h < this.y - this.h);
  }
}
// circle class for a circle shaped query
class Circle {

  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.rSquared = this.r * this.r;
  }

  get w() {
    return this.r;
  }

  get h() {
    return this.r;
  }

  contains(point) {
    // check if the point is in the circle by checking if the euclidean distance of
    // the point and the center of the circle if smaller or equal to the radius of
    // the circle
    let d = Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2);
    return d <= this.rSquared;
  }

  intersects(range) {
    let xDist = Math.abs(range.x - this.x);
    let yDist = Math.abs(range.y - this.y);
    // radius of the circle
    let r = this.r;
    let w = range.w;
    let h = range.h;
    let edges = Math.pow(xDist - w, 2) + Math.pow(yDist - h, 2);
    // no intersection
    if (xDist > r + w || yDist > r + h)
      return false;
    // intersection within the circle
    if (xDist <= w || yDist <= h)
      return true;
    // intersection on the edge of the circle
    return edges <= this.rSquared;
  }
}
class QuadTree {

  constructor(boundary, capacity) {
    if (!boundary) {
      throw TypeError('boundary is null or undefined');
    }
    if (!(boundary instanceof Rectangle)) {
      throw TypeError('boundary should be a Rectangle');
    }
    if (typeof capacity !== 'number') {
      throw TypeError(`capacity should be a number but is a ${typeof capacity}`);
    }
    if (capacity < 1) {
      throw RangeError('capacity must be greater than 0');
    }
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  subdivide() {
    let x = this.boundary.x;
    let y = this.boundary.y;
    let w = this.boundary.w / 2;
    let h = this.boundary.h / 2;

    let ne = new Rectangle(x + w, y - h, w, h);
    this.northeast = new QuadTree(ne, this.capacity);
    let nw = new Rectangle(x - w, y - h, w, h);
    this.northwest = new QuadTree(nw, this.capacity);
    let se = new Rectangle(x + w, y + h, w, h);
    this.southeast = new QuadTree(se, this.capacity);
    let sw = new Rectangle(x - w, y + h, w, h);
    this.southwest = new QuadTree(sw, this.capacity);

    this.divided = true;
  }

  insert(point) {
    if (!this.boundary.contains(point)) {
      return false;
    }
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) {
      this.subdivide();
    }
    if (this.northeast.insert(point) ||
      this.northwest.insert(point) ||
      this.southeast.insert(point) ||
      this.southwest.insert(point)) {
      return true;
    }
  }

  query(type, range, found) {
    if (!found) {
      found = [];
    }
    if (!range.intersects(this.boundary)) {
      return found;
    }
    for (let p of this.points) {
      if (_typeq_check(type, p) && range.contains(p)) {
        found.push(p);
      }
    }
    if (this.divided) {
      this.northwest.query(type, range, found);
      this.northeast.query(type, range, found);
      this.southwest.query(type, range, found);
      this.southeast.query(type, range, found);
    }
    return found;
  }

  all() {
    return this.query(null, this.boundary);
  }
}


// A class with the signature of a quadtree but that acts like a plain array
// This is used to compare the performance of the quadtree with an array
// without having to change any of the code
class FakeQuadTree {

  constructor() { this.contents = []; }

  insert(point) { this.contents.push(point); }

  query(type) { return this.contents.filter(p => _typeq_check(type, p)); }

  all() { return this.contents.map(p => p); }
}
