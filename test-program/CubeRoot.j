class CubeRoot {

  constructor(){
    // Here is a comment!
    // In this example, we compute the cube root
    // of 20 to within 0.0001 using binary search.
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
    number midRoot = ((maxRoot + minRoot) / 2);
    while ((maxRoot - minRoot) >= 0.0001) {
      midRoot = ((maxRoot + minRoot) / 2);
      if(f(midRoot) <= of){
        minRoot = midRoot;
      } else {
        maxRoot = midRoot;
      }
    }
    return midRoot;
  }

}