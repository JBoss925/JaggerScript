class OnlyTheEvens {

  constructor(){
    // This example program is a very basic
    // example of looping through a range of
    // int values, using the mod operator, and
    // logging to the console.
  }

  func main(){
    onlyPrintTheEvens(10);
  }

  func onlyPrintTheEvens(number upTo){
    number i = 0;
    while(i < upTo) {
      if(i % 2 == 0){
        console.log(i);
      }
      i = i + 1;
    }
  }

}