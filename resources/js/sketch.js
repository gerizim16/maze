function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
}

function difference(setA, setB) {
    let _difference = new Set(setA);
    for (let elem of setB) _difference.delete(elem);
    return _difference;
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
                p.adjacents = p.adjacents ?? new Set();
                q.adjacents = q.adjacents ?? new Set();
                p.adjacents.add(q);
                q.adjacents.add(p);
                edges.push([p, q]);
            }
        }
    }

    return edges;
}

function createPathWay(pointA, pointB) {
    pointA.pathWays = pointA.pathWays ?? new Set();
    pointA.pathWays.add(pointB);
    pointB.pathWays = pointB.pathWays ?? new Set();
    pointB.pathWays.add(pointA);
}

// uses Aldous-Broder algorithm
function createMaze(points) {
    let pathWays = [];
    let currentPoint = points[getRandomInt(points.length)];
    currentPoint.visited = true;

    while (points.some(point => !point.visited)) {
        const neighPoint = Array.from(currentPoint.adjacents)[getRandomInt(currentPoint.adjacents.size)];
        if (!neighPoint.visited) {
            pathWays.push([currentPoint, neighPoint]);
            createPathWay(currentPoint, neighPoint);
            neighPoint.visited = true;
        }
        currentPoint = neighPoint;
    }

    return pathWays;
}

function addRandomPathways(points, n = 1, maxTries = 20) {
    let pathWays = [];
    outer: for (let i = 0; i < n; i++) {
        let candidates = new Set();
        let point;
        let tries = 0;
        while (candidates.size == 0) {
            point = points[getRandomInt(points.length)];
            candidates = difference(point.adjacents, point.pathWays);
            if (tries++ == maxTries) break outer;
        }
        const neighPoint = Array.from(candidates)[getRandomInt(candidates.size)];
        pathWays.push([point, neighPoint]);
        createPathWay(point, neighPoint);
    }
    return pathWays;
}

function reconstructPath(current, cameFrom) {
    let totalPath = [current,];
    let from;
    while (from = cameFrom.get(current)) {
        current = from;
        totalPath.push(current);
    }
    return totalPath.reverse();
}

function hScore(node, goal) {
    return dist(goal.x, goal.y, node.x, node.y);
}

function weight(from, to) {
    return dist(from.x, from.y, to.x, to.y);
}

function aStar(start, goal) {
    let openSet = new PriorityQueue((a, b) => a.priority < b.priority);
    let cameFrom = new Map();
    let gScore = new Map();
    gScore.set(start, 0);
    let fScore = new Map();
    fScore.set(start, hScore(start, goal));
    let visited = new Set();
    visited.add(start);

    openSet.push(start, fScore.get(start));
    while (openSet.size != 0) {
        const currNode = openSet.pop();
        if (currNode === goal) {
            return reconstructPath(currNode, cameFrom);
        }
        for (const neighbor of currNode.pathWays) {
            const tempGScore = gScore.get(currNode) + weight(currNode, neighbor);
            if (!visited.has(neighbor) || tempGScore < gScore.get(neighbor)) {
                visited.add(neighbor);
                cameFrom.set(neighbor, currNode);
                gScore.set(neighbor, tempGScore);
                fScore.set(neighbor, tempGScore + hScore(neighbor, goal));
                if (!visited.has(neighbor)) {
                    openSet.push(neighbor, fScore.get(neighbor));
                } else {
                    openSet.remove(neighbor);
                    openSet.push(neighbor, fScore.get(neighbor));
                }
            }
        }
    }
    return [];
}

function maze(sketch) {
    const colors = {
        darkGreen: [38, 70, 83],
        yellow: [233, 196, 106],
        orange: [244, 162, 97],
        red: [231, 111, 81],
        bluegreen: [42, 157, 143],
        white: 220,
    }

    let points, edges, cells, pathWays;
    let pointsIndex, edgesIndex, pathWaysIndex;
    let pointsIndexInc, edgesIndexInc, pathWaysIndexInc;
    let radius, radiusSlider;
    let strokeWeightSlider;
    let difficultySlider;
    let solution;
    let start, goal;
    let solve, solved, aStarVars;

    function sliderChanged(slider) {
        if (slider.oldValue != slider.value()) {
            slider.oldValue = slider.value();
            return true;
        }
        return false;
    }

    function redraw() {
        sketch.background(colors.darkGreen);
        pointsIndex = 0;
        edgesIndex = 0;
        pathWaysIndex = 0;
    }

    function resetAStar() {
        start = null; goal = null;
        solve = false; solved = false;
    }

    function solveAStar() {
        solve = true;
        aStarVars = {
            openSet: new PriorityQueue((a, b) => a.priority < b.priority),
            closedSet: [],
            cameFrom: new Map(),
            gScore: new Map(),
            fScore: new Map(),
            visited: new Set(),
        }
        aStarVars.gScore.set(start, 0);
        aStarVars.fScore.set(start, hScore(start, goal));
        aStarVars.visited.add(start);
        aStarVars.openSet.push(start, aStarVars.fScore.get(start));
    }

    function drawPoints(pointArray, color, weight) {
        sketch.push();
        sketch.stroke(color);
        sketch.strokeWeight(weight);
        for (const point of pointArray) {
            sketch.point(point.x, point.y);
        }
        sketch.pop();
    }

    function drawPath(path, color, weight) {
        sketch.push();
        sketch.noFill();
        sketch.stroke(color);
        sketch.strokeWeight(weight);
        sketch.beginShape();
        for (const point of path) {
            sketch.vertex(point.x, point.y);
        }
        sketch.endShape();
        sketch.pop();
    }

    function drawPathTo(point, color, weight) {
        drawPath(reconstructPath(point, aStarVars.cameFrom), color, weight);
    }

    function updateMaze() {
        resetAStar();
        const difficulty = 0.1 - difficultySlider.value();
        radius = radiusSlider.value();

        // sample points
        const returnObject = poissonDiskSampling(radius, sketch.width, sketch.height);
        [points, cells] = [returnObject.points, returnObject.cells];
        // triangulate
        edges = triangulate(points, 3 * radius);
        shuffle(edges);
        // create the maze
        pathWays = createMaze(points);
        pathWays = pathWays.concat(addRandomPathways(points, edges.length * difficulty));

        // set animation speeds
        pointsIndexInc = Math.max(1, Math.floor(points.length * 0.05));
        edgesIndexInc = Math.max(1, Math.floor(edges.length * 0.08));
        pathWaysIndexInc = Math.max(1, Math.floor(pathWays.length * 0.05));
    }

    function reset() {
        updateMaze();
        redraw();
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

        strokeWeightSlider = sketch.createSlider(1, 40, 15, 1);
        strokeWeightSlider.position(20, 45);
        strokeWeightSlider.style('width', '200px');

        difficultySlider = sketch.createSlider(0, 0.1, 0.1, 0.05);
        difficultySlider.position(20, 70);
        difficultySlider.style('width', '200px');

        sketch.textSize(20);
        reset()

        sketch.strokeJoin(sketch.ROUND);
    };

    sketch.draw = function () {
        if (sliderChanged(radiusSlider) || sliderChanged(difficultySlider)) {
            reset();
        }

        sketch.push();
        if (pointsIndex < points.length) {
            sketch.stroke(colors.red);
            sketch.strokeWeight(8);
            for (let i = pointsIndex; i < Math.min(pointsIndexInc + pointsIndex, points.length); i++) {
                const point = points[i];
                sketch.point(point.x, point.y);
            }
            pointsIndex += pointsIndexInc;
        } else if (edgesIndex < edges.length) {
            sketch.stroke(colors.red);
            sketch.strokeWeight(2);
            for (let i = edgesIndex; i < Math.min(edgesIndex + edgesIndexInc, edges.length); i++) {
                const edge = edges[i];
                sketch.line(edge[0].x, edge[0].y, edge[1].x, edge[1].y);
            }
            edgesIndex += edgesIndexInc;
        } else if (pathWaysIndex < pathWays.length) {
            sketch.stroke(colors.white);
            sketch.strokeWeight(strokeWeightSlider.value());
            for (let i = pathWaysIndex; i < Math.min(pathWaysIndex + pathWaysIndexInc, pathWays.length); i++) {
                const pathWay = pathWays[i];
                sketch.line(pathWay[0].x, pathWay[0].y, pathWay[1].x, pathWay[1].y);
            }
            pathWaysIndex += pathWaysIndexInc;
        } else {
            sketch.background(colors.darkGreen);
            sketch.stroke(colors.white);
            sketch.strokeWeight(strokeWeightSlider.value());
            for (const pathWay of pathWays) {
                sketch.line(pathWay[0].x, pathWay[0].y, pathWay[1].x, pathWay[1].y);
            }
        }

        if (solve) {
            if (aStarVars.openSet.size != 0) {
                const currNode = aStarVars.openSet.pop();
                aStarVars.closedSet.push(currNode);
                if (currNode === goal) {
                    solution = reconstructPath(goal, aStarVars.cameFrom);
                    solve = false;
                    solved = true;
                } else {
                    for (const neighbor of currNode.pathWays) {
                        const tempGScore = aStarVars.gScore.get(currNode) + weight(currNode, neighbor);
                        if (!aStarVars.visited.has(neighbor) || tempGScore < aStarVars.gScore.get(neighbor)) {
                            aStarVars.visited.add(neighbor);
                            aStarVars.cameFrom.set(neighbor, currNode);
                            aStarVars.gScore.set(neighbor, tempGScore);
                            aStarVars.fScore.set(neighbor, tempGScore + hScore(neighbor, goal));
                            if (!aStarVars.visited.has(neighbor)) {
                                aStarVars.openSet.push(neighbor, aStarVars.fScore.get(neighbor));
                            } else {
                                aStarVars.openSet.remove(neighbor);
                                aStarVars.openSet.push(neighbor, aStarVars.fScore.get(neighbor));
                            }
                        }
                    }
                }
                drawPoints(aStarVars.openSet.elements, 10, strokeWeightSlider.value());
                drawPoints(aStarVars.closedSet, 100, strokeWeightSlider.value());
                drawPoints([start, goal], colors.bluegreen, strokeWeightSlider.value() * 2);
                drawPathTo(currNode, colors.orange, Math.max(1, strokeWeightSlider.value() * 0.5));
            } else {
                solved = true;
                solve = false;
            }
        } else if (solved) {
            drawPath(solution, colors.red, strokeWeightSlider.value() * 0.8);
        }
        sketch.pop();

        sketch.stroke(colors.white);
        sketch.strokeWeight(4);
        sketch.textAlign(sketch.LEFT);
        sketch.text('radius', 240, 37);
        sketch.text('stroke width', 240, 62);
        sketch.text('difficulty', 240, 87);
        sketch.textAlign(sketch.RIGHT);
        sketch.text('click or tap on the maze to select start and goal points', sketch.width - 30, 37);
    };

    sketch.mouseClicked = function () {
        const pointIndex = cells.getIndex({ x: sketch.mouseX, y: sketch.mouseY });
        let pointCandidates = [];
        for (let y = Math.max(0, pointIndex.y - 1); y <= Math.min(cells.height - 1, pointIndex.y + 1); y++) {
            for (let x = Math.max(0, pointIndex.x - 1); x <= Math.min(cells.width - 1, pointIndex.x + 1); x++) {
                const tempPoint = cells.grid[y][x];
                if (tempPoint != null) {
                    pointCandidates.push(tempPoint);
                }
            }
        }
        if (pointCandidates.length != 0) {
            let point = pointCandidates[0];
            let candidateDist;
            let minDist = dist(point.x, point.y, sketch.mouseX, sketch.mouseY);
            for (const candidate of pointCandidates) {
                candidateDist = dist(candidate.x, candidate.y, sketch.mouseX, sketch.mouseY);
                if (candidateDist < minDist) {
                    point = candidate;
                    minDist = candidateDist;
                }
            }
            if (goal == null) {
                goal = point;
            } else {
                start = goal;
                goal = point;
                solveAStar();
            }
        }
        console.log(start, goal);
    }

    sketch.keyPressed = function () {
    };

    sketch.keyReleased = function () {
    };

    sketch.windowResized = function () {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
        reset();
    }
}

let p5Sketch = new p5(maze, 'gameContainer');

window.addEventListener("keydown", function (e) {
    // space and arrow keys
    if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);