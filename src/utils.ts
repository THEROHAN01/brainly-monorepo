export function random(len:number){

    let options = "qwertyuiopasdfghjklzxcvbnm1234567890";
    let length = options.length;
    let ans = "";

    for ( let i = 0 ; i < len ; i++ ){
        ans += options[Math.floor((Math.random() * length))] // options of a random number between 0 => 20 (length)
    }
    return ans ;
}