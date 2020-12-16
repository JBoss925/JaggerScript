
// In this example, we create a DoublyLinkedList object
// which we can add numbers to in order to access them
// later and remove them when necessary.


class Main {

  constructor(){}

  func main(){
    DoublyLinkedList list = new DoublyLinkedList();
    list.add(7);
    list.add(12);
    list.add(8);
    list.add(42);
    console.log('All elements:');
    number i = 0;
    while(i < list.length){
      console.log(list.get(i));
      i = i + 1;
    }
    console.log('');
    console.log('Got second element:');
    console.log(list.get(1));
    console.log('');
    console.log('Removed third element:');
    console.log(list.remove(2));
    console.log('');
    console.log('Removed first element:');
    console.log(list.remove(0));
    console.log('');
    console.log('Final list length:');
    console.log(list.length);
    console.log('');
    console.log('Final elements:');
    number j = 0;
    while(j < list.length){
      console.log(list.get(j));
      j = j + 1;
    }
  }

}

class DoublyLinkedList {

  Node head;
  Node tail;
  number length = 0;

  constructor(){}

  func add(number value){
    Node newNode = new Node(value);
    if(head == undefined){
      head = newNode;
      tail = head;
    } else {
      tail.linkNext(newNode);
      newNode.linkPrev(tail);
      tail = newNode;
    }
    length = length + 1;
  }

  func getNode(number index){
    Node nextNode = head;
    number i = 0;
    while (i < index) {
      nextNode = nextNode.getNext();
      i = i + 1;
    }
    return nextNode;
  }

  func get(number index){
    Node inQ = getNode(index);
    return inQ.getValue();
  }

  func remove(number index){
    Node removed = getNode(index);
    Node next = removed.getNext();
    Node prev = removed.getPrev();
    if(next != undefined){
      next.linkPrev(prev);
    }
    if(prev != undefined){
      prev.linkNext(next);
    }
    if(index == 0){
      head = next;
    }
    if(index == length){
      tail = prev;
    }
    removed.linkNext(undefined);
    removed.linkPrev(undefined);
    length = length - 1;
    return removed.getValue();
  }

}

class Node {

  Node next;
  Node prev;
  number value;

  constructor(number x){
    value = x;
  }

  func linkNext(Node n){
    next = n;
  }

  func linkPrev(Node n){
    prev = n;
  }

  func getNext(){
    return next;
  }

  func getPrev(){
    return prev;
  }

  func getValue(){
    return value;
  }

}