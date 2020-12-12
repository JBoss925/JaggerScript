class Test {

  constructor(){}

  string anotherStr = 'another string here';

  func main(){
    number x = 6.7;
    number y = 8.91;
    number z = addSomeNumbers(x, y);
    console.log(z);
    string testStr = 'here is a string';
    console.log(testStr);
    checkANumber(z);
    console.log(anotherStr);
    TestTwo inst = instantiateAnotherClass(12);
    TestTwo instTwo = inst;
    number instY = inst.getH();
    inst.h = 0.234;
    console.log(instY);
    console.log(inst.h);
    console.log(instTwo);
    console.log(instTwo.tt.getVal());
  }

  func addSomeNumbers(number numone, number numtwo){
    return numone + numtwo;
  }

  func checkANumber(number numthree){
    if(numthree < 15){
      console.log('Less than 15');
    } else {
      console.log('More than 15');
    }
  }

  func instantiateAnotherClass(number a){
    TestTwo s = new TestTwo(a, 9);
    return new TestTwo(a, 10);
  }

}

class TestTwo {

  number h;
  TestThree tt;

  constructor(number a, number o){
    h = a;
    tt = new TestThree(a);
    console.log(o);
  }

  func getH(){
    return h;
  }

}

class TestThree {

  number z;
  number x = 54.34;

  constructor(number b){
    z = b;
  }

  func getVal(){
    return z + x;
  }

}