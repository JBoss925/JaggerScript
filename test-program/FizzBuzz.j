class FizzBuzz {

  constructor(){}

  func main(){
    fizzBuzz(30);
  }

  func fizzBuzz(number upTo){
    number i = 1;
    while(i <= upTo) {
      if(i % 3 == 0){
        if(i % 5 == 0){
          console.log('FizzBuzz');
        } else {
          console.log('Fizz');
        }
      } elif (i % 5 == 0){
        console.log('Buzz');
      } else {
        console.log(i);
      }
      i = i + 1;
    }
  }

}