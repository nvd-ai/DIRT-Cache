function Node(reg) {
    this.reg = reg;
    this.next = null;
    this.prev = null;
    reg.lruNode = this;
}

function lru() {
    this.head = null;
    this.tail = null;
}

lru.prototype = {
    insert: function (reg) {
        let node = new Node(reg);

        if (!this.head) {
            this.head = this.tail = node;
            return;
        }

        let next = this.head;
        this.head = node;
        this.head.next = next;
        next.prev = this.head;
        if (next.next === null)
            this.tail = next;
    },
    access: function (reg) {
        if (reg.lruNode === null)
            this.insert(reg);

        let node = reg.lruNode;
        let prevNode = node.prev;
        let nextNode = node.next;
        node.next = this.head;

        this.head = node;
        this.head.prev = null;

        if (this.tail === node && prevNode) {
            this.tail = prevNode;
            this.tail.next = null;
        }
        if (prevNode)
            prevNode.next = nextNode;
        if (nextNode)
            nextNode.prev = prevNode;
    },

    remove: function () {
        let lru = this.tail;

        if (lru) {
            if (lru.prev) {
                this.tail = lru.prev;
                this.tail.next = null;
            }

            return lru.reg;
        }
        else return null;
    }
}

module.exports = lru;