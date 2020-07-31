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
                    if (Math.hypot(this.grid[y][x].x - point.x, this.grid[y][x].y - point.y) < radius) {
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

function createGraph(cells) {
    const radius = 1;
    let edges = [];
    let grid = cells.grid;

    // for each cell
    for (let y = 0; y < cells.height; y++) {
        for (let x = 0; x < cells.width; x++) {
            if (!grid[y][x]) continue;
            grid[y][x].adjacents = grid[y][x].adjacents ?? new Set();
            // for each neigbor of the cell
            for (let yNeighbor = Math.max(0, y - radius); yNeighbor <= Math.min(cells.height - 1, y + radius); yNeighbor++) {
                for (let xNeighbor = Math.max(0, x - radius); xNeighbor <= Math.min(cells.width - 1, x + radius); xNeighbor++) {
                    if (!grid[yNeighbor][xNeighbor] || (yNeighbor == y && xNeighbor == x)) continue;
                    grid[y][x].adjacents.add(grid[yNeighbor][xNeighbor]);
                    // add edge to edges
                    if (grid[yNeighbor][xNeighbor].adjacents &&
                        grid[yNeighbor][xNeighbor].adjacents.has(grid[y][x])) {
                        edges.push([grid[y][x], grid[yNeighbor][xNeighbor]]);
                    }
                }
            }
        }
    }

    return edges;
}

function maze(sketch) {
    let points, edges, cells;
    let radius;

    sketch.preload = function () {
    };

    sketch.setup = function () {
        sketch.createCanvas(800, 800);
        sketch.background(240);

        radius = 50;
        const returnObject = poissonDiskSampling(radius, sketch.width, sketch.height);
        [points, cells] = [returnObject.points, returnObject.cells];
        edges = createGraph(cells);
    };

    sketch.draw = function () {
        // sketch.stroke(0);
        // sketch.strokeWeight(1);
        // for (let x = 0; x < sketch.width; x += Math.floor(radius / Math.sqrt(2))) {
        //     sketch.line(x, 0, x, sketch.height);
        // }
        // for (let y = 0; y < sketch.height; y += Math.floor(radius / Math.sqrt(2))) {
        //     sketch.line(0, y, sketch.width, y);
        // }

        sketch.stroke(0, 0, 255);
        sketch.strokeWeight(4);
        for (const edge of edges) {
            sketch.line(edge[0].x, edge[0].y, edge[1].x, edge[1].y);
        }

        sketch.stroke(255, 0, 0);
        sketch.strokeWeight(4);
        for (const point of points) {
            sketch.point(point.x, point.y);
        }

        sketch.noLoop();
    };

    sketch.keyPressed = function () {
    };

    sketch.keyReleased = function () {
    };
}

let p5Sketch = new p5(maze, 'gameContainer');

window.addEventListener("keydown", function (e) {
    // space and arrow keys
    if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);