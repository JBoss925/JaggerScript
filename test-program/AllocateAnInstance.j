class AllocateAnInstance {

  constructor(){
    // Here, we allocate a new instance which itself
    // allocates another instance as a global member.
    // Then we can reference these members in a chain
    // and grab nested values from deep within objects!
  }

  func main(){
    InstTwo instTwo = new InstTwo(9, 10, 'hello');
    console.log(instTwo.h);
    console.log(instTwo.it.p);
    console.log(instTwo.it.l);
  }

}

class InstTwo {

  string h;
  InstThree it;

  constructor(number x, number z, string y){
    console.log('inside InstTwo!');
    console.log(x);
    it = new InstThree(z);
    console.log('back inside InstTwo!');
    h = y;
  }

}

class InstThree {

  string l = 'I was here from the beginning';
  number p;

  constructor(number k){
    console.log('inside InstThree!');
    p = k;
  }

}