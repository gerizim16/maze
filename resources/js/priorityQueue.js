class PriorityQueue {
    constructor(comparator = (a, b) => a.priority > b.priority) {
        this._heap = [];
        this._comparator = comparator;
    }
    get size() {
        return this._heap.length;
    }
    get empty() {
        return this.size == 0;
    }
    get elements() {
        let elements = [];
        for (const element of this._heap) {
            elements.push(element.object);
        }
        return elements;
    }
    peek() {
        return this._heap[PriorityQueue.top()].object;
    }
    push(value, priority = null) {
        this._heap.push({
            object: value,
            priority: priority,
        });
        this._siftUp();
        return this.size;
    }
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size - 1;
        if (bottom > PriorityQueue.top()) {
            this._swap(PriorityQueue.top(), bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }
    popAt(index) {
        const poppedValue = this._heap[index];
        const bottom = this.size - 1;
        if (bottom > PriorityQueue.top()) {
            this._swap(index, bottom);
        }
        this._heap.pop();
        this._siftDown(index);
        return poppedValue;
    }
    remove(object) {
        for (let i = 0; i < this._heap.length; i++) {
            if (this._heap[i].object === object) {
                return this.popAt(i);
            }
        }
        return false;
    }
    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }
    _swap(i, j) {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
    }
    _siftUp() {
        let node = this.size - 1;
        while (node > PriorityQueue.top() && this._greater(node, PriorityQueue.parent(node))) {
            this._swap(node, PriorityQueue.parent(node));
            node = PriorityQueue.parent(node);
        }
    }
    _siftDown(node = PriorityQueue.top()) {
        while (
            (PriorityQueue.left(node) < this.size && this._greater(PriorityQueue.left(node), node)) ||
            (PriorityQueue.right(node) < this.size && this._greater(PriorityQueue.right(node), node))
        ) {
            let maxChild = (PriorityQueue.right(node) < this.size && this._greater(PriorityQueue.right(node), PriorityQueue.left(node))) ? PriorityQueue.right(node) : PriorityQueue.left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }
    static top() { return 0; }
    static parent(i) { return ((i + 1) >>> 1) - 1; }
    static left(i) { return (i << 1) + 1; }
    static right(i) { return (i + 1) << 1; }
}