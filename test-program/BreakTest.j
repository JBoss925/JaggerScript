class BreakTest {

  constructor(){
    // This is a program that tests loop breaks.
    // When working, this should log '1' four times
    // in the console.
  }

  func main(){
    test();
  }

  func test(){
    number i = 0;
    number z = 0;
    number x = 0;
    number y = 0;
    while(i < 1000){
      while(z < 1000){
        x = x + 1;
        z = z + 1;
        break;
      }
      y = y + 1;
      i = i + 1;
      break;
    }
    console.log(i);
    console.log(z);
    console.log(x);
    console.log(y);
  }

}