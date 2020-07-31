function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {

        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function getRandomInt(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// using Robert Bridson's algorithm
function poissonDiskSampling(radius, width, height, k = 30) {
    const dimensions = 2;

    // initialize cell object
    let cells = {
        size: Math.floor(radius / Math.sqrt(dimensions)),
        get width() { return Math.ceil(width / this.size) + 1 },
        get height() { return Math.ceil(height / this.size) + 1 },
    };
    cells.grid = new Array(cells.height);
    for (let i = 0; i < cells.grid.length; i++) {
        cells.grid[i] = new Array(cells.width);
    }

    cells.getIndex = function (point) {
        return {
            x: Math.floor(point.x / this.size),
            y: Math.floor(point.y / this.size),
        }
    };
    cells.insertPoint = function (point) {
        const index = this.getIndex(point);
        if (this.grid[index.y][index.x] != null) {
            throw ('overwriting cell');
        }
        this.grid[index.y][index.x] = point;
    };
    cells.validPoint = function (point) {
        if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) return false;
        const index = this.getIndex(point);
        // for each 8 or less adjacent point
        for (let y = Math.max(index.y - 1, 0); y <= Math.min(index.y + 1, this.height - 1); y++) {
            for (let x = Math.max(index.x - 1, 0); x <= Math.min(index.x + 1, this.width - 1); x++) {
                // if point exists
                if (this.grid[y][x] != null) {
                    // if distance between adjacent point is < radius, return false
                    if (dist(this.grid[y][x].x, this.grid[y][x].y, point.x, point.y) < radius) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    // initialize arrays
    let points = [];
    let activePoints = [];


    // initial point
    let p0 = {
        x: getRandomInt(width),
        y: getRandomInt(height),
    }
    cells.insertPoint(p0);
    points.push(p0);
    activePoints.push(p0);

    while (activePoints.length) {
        const activePointIndex = getRandomInt(activePoints.length);
        const activePoint = activePoints[activePointIndex];

        let found = false;
        for (let tries = 0; tries < k; tries++) {
            const theta = Math.random() * 2 * Math.PI;
            const pointRadius = getRandomInt(radius, 2 * radius);
            let newPoint = {
                x: activePoint.x + pointRadius * (Math.cos(theta)),
                y: activePoint.y + pointRadius * (Math.sin(theta)),
            }

            if (!cells.validPoint(newPoint)) continue;

            points.push(newPoint);
            cells.insertPoint(newPoint);
            activePoints.push(newPoint);
            found = true;
            break;
        }

        if (!found) {
            activePoints.splice(activePointIndex, 1);
        }
    }

    return { points: points, cells: cells };
}

function triangulate(points, maxEdgeLength = null) {
    let edges = [];

    function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
    const delaunay = Delaunator.from(points, point => point.x, point => point.y);
    for (let e = 0; e < delaunay.triangles.length; e++) {
        if (e > delaunay.halfedges[e]) {
            const p = points[delaunay.triangles[e]];
            const q = points[delaunay.triangles[nextHalfedge(e)]];
            if (maxEdgeLength == null || dist(p.x, p.y, q.x, q.y) < maxEdgeLength) {
                edges.push([p, q]);
            }
        }
    }

    return edges;
}

function createMaze() {
}

function maze(sketch) {
    let points, edges, cells;
    let pointsIndex, edgesIndex;
    let pointsIndexInc, edgesIndexInc;
    let radius;
    let radiusSlider;

    function sliderChanged(slider) {
        if (slider.oldValue != slider.value()) {
            slider.oldValue = slider.value();
            return true;
        }
        return false;
    }

    function reset() {
        sketch.background(240);
        radius = radiusSlider.value();
        pointsIndex = 0;
        edgesIndex = 0;
        const returnObject = poissonDiskSampling(radius, sketch.width, sketch.height);
        [points, cells] = [returnObject.points, returnObject.cells];
        edges = triangulate(points, 3 * radius);
        shuffle(edges);

        pointsIndexInc = Math.floor(points.length * 0.05);
        edgesIndexInc = Math.floor(edges.length * 0.08);
    }

    sketch.preload = function () {
    };

    sketch.setup = function () {
        let canvas = sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
        canvas.style('display', 'block');
        sketch.frameRate(30);

        radiusSlider = sketch.createSlider(10, 100, 30, 5);
        radiusSlider.position(20, 20);
        radiusSlider.style('width', '200px');
        
        sketch.textSize(20);
        reset()
    };

    sketch.draw = function () {
        if (sliderChanged(radiusSlider)) {
            reset();
        }

        sketch.push();
        sketch.stroke(231, 111, 81);
        sketch.strokeWeight(4);
        if (pointsIndex < points.length) {
            for (let i = pointsIndex; i < Math.min(pointsIndexInc + pointsIndex, points.length); i++) {
                const point = points[i];
                sketch.point(point.x, point.y);
            }
            pointsIndex += pointsIndexInc;
        } else if (edgesIndex < edges.length) {
            for (let i = edgesIndex; i < Math.min(edgesIndex + edgesIndexInc, edges.length); i++) {
                const edge = edges[i];
                sketch.line(edge[0].x, edge[0].y, edge[1].x, edge[1].y);
            }
            edgesIndex += edgesIndexInc;
        }

        sketch.pop();
        sketch.text('radius', 240, 37);
    };

    sketch.keyPressed = function () {
    };

    sketch.keyReleased = function () {
    };

    sketch.windowResized = function () {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
    }
}

let p5Sketch = new p5(maze, 'gameContainer');

window.addEventListener("keydown", function (e) {
    // space and arrow keys
    if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);