
// In this example, we can see the ability to pass
// instances by reference. We create a B instance,
// and then pass it by reference to a C instance,
// which logs the B instance's value.

// Additionally, we can resassign values on instances.
// Asking C for the B instance value again will re-evaluate on
// the same REFERENCE as before, but not the same value.

// Thus, we see that '5' is logged after we reassign bInst.val
// and ask C to log the value of that B reference again.

class A {

  constructor(){}

  func main(){
    C cInst = new C();
    B bInst = new B(30);
    cInst.logBVal(bInst);
    bInst.val = 5;
    cInst.logBValAgain();
  }

}

class B {

  number val;

  constructor(number y){
    val = y;
  }

}

class C {

  B bInstFromBefore;

  constructor(){}

  func logBVal(B bInst){
    console.log(bInst.val);
    bInstFromBefore = bInst;
  }

  func logBValAgain(){
    console.log(bInstFromBefore.val);
  }

}