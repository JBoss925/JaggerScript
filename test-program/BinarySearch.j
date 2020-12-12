class BinarySearch {

  constructor(){
    // Here is a comment!
    // In this example, we compute the cube root
    // of 20 to within 0.001 using binary search.
  }

  func main(){
    console.log(cubeRoot(20));
  }

  func f(number x){
    return x * x * x;
  }

  func cubeRoot(number of){
    number minRoot = 0;
    number maxRoot = of;
    while ((maxRoot - minRoot) >= 0.0001) {
      number midRoot = ((maxRoot + minRoot) / 2);
      if(f(midRoot) <= of){
        minRoot = midRoot;
      } else {
        maxRoot = midRoot;
      }
    }
    return midRoot;
  }

}