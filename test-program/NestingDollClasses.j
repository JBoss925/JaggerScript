
// In this example, we can see how constructors can call
// one another to create complex objects with deep
// nested values.

class COne {

  CTwo t;
  number val;

  constructor(){}

  func main(){
    t = new CTwo(50);
    console.log(t.val);
    console.log(t.t.val);
    console.log(t.t.t.val);
  }

}

class CTwo {

  CThree t;
  number val;

  constructor(number x){
    val = x;
    t = new CThree(val - 10);
  }

}

class CThree {

  CFour t;
  number val;

  constructor(number x){
    val = x;
    t = new CFour(val - 10);
  }

}

class CFour {

  number val;

  constructor(number x){
    val = x;
  }

}