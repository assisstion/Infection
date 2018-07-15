import * as Display from 'display'
import P5Behavior from 'p5beh';
import * as Floor from 'floor';

const pb = new P5Behavior();


const passThrough = [0];

//Person movement state
const STATE_STOPPED = 0;
const STATE_MOVING = 1;

//Virus type
const VIRUS_NONE = 0;
const VIRUS_BASIC = 1;
const VIRUS_INCURABLE = 2;

const FPS = 20;
//stop time in number of frames
const STOP_TIME = FPS * 2;

//Speed at which people move at
const MOVESPEED = 3.0;

//Padding of the border (to prevent target seeking)
const PADDING = 20;

//Distance away from target such that the target is considered reached
const TARGET_DIST = 5;

//Radius around user position in which people are cured
const CURE_RADIUS = 15;

const LAND = 0;
const WATER = 1;

/*Creates the map for city virus initates a 2D array*/

const RIVER_WIDTH = 60;
const BRIDGE_WIDTH = 40;
const WIDTH = 576;
const HEIGHT = 576;
const HALF_MAP = 288;

const IMMUNITY_TIME = FPS * 5;

var island;
var city;

var infectedCount = 0;
var totalCount = 0;
//0: city
//1: islands
var mapNum = 0;
var map;

var width = Display.width;
var height = Display.height;

var islandStr;
var cityStr;

var islandBg;
var cityBg;

var bg;
//var toArray;

var people = [];

class Person {
  constructor(map, x, y, radius, virus){
    this.map = map;
    //float x, y
    this.x = x;
    this.y = y;
    //int radius
    this.radius = radius;
    this.virus = virus;
    this.state = STATE_STOPPED;
    this.stopTime = STOP_TIME;
    this.immunity = 0;
    totalCount++;
    if(virus > 0){
      infectedCount++;
    }
  }

  checkCureCollision(cureX, cureY){
    if(this.virus == VIRUS_INCURABLE){
      return;
    }
    let dx = cureX - this.x;
    let dy = cureY - this.y;
    let rad = CURE_RADIUS + this.radius;
    if(dx * dx + dy * dy < rad * rad){
      if(this.virus > VIRUS_NONE){
        infectedCount--;
        this.virus = VIRUS_NONE;
        this.immunity = IMMUNITY_TIME;
      }
    }
  }

  checkPersonCollision(person){
    if(this.immunity > 0 || person.immunity > 0){
      return;
    }
    let dx = person.x - this.x;
    let dy = person.y - this.y;
    let rad = person.radius + this.radius;
    if(dx * dx + dy * dy < rad * rad){
      this.interactPerson(person);
    }
  }

  //Spread virus, higher wins
  interactPerson(person){
    if(this.virus > person.virus){
      let newVal = this.virusSpread(this.virus);
      if(person.virus == VIRUS_NONE && newVal > VIRUS_NONE){
        infectedCount++;
      }
      person.virus = newVal;
    }
    if(person.virus > this.virus){
      newVal = this.virusSpread(person.virus);
      if(this.virus == VIRUS_NONE && newVal > VIRUS_NONE){
        infectedCount++;
      }
      this.virus = newVal;
    }
  }

  virusSpread(virusState){
    if(virusState == VIRUS_INCURABLE || virusState == VIRUS_BASIC){
      return VIRUS_BASIC;
    }
    return VIRUS_NONE;
  }

  inMap(x, y){
    if(x < 0 || y < 0){
      return false;
    }
    if(x >= Display.width || y >= Display.height){
      return false;
    }
    return true;
  }

  //Checks if the current position is valid
  //Return true if position is valid
  checkCollision(){
    for(let dx = -this.radius; dx <= this.radius; dx++){
      let newX = Math.floor(this.x) + dx;
      for(let dy = -this.radius; dy <= this.radius; dy++){
        let newY = Math.floor(this.y) + dx;
        if(!this.inMap(newX, newY)){
          continue;
        }
        // Distance formula for circle
        if(dx * dx + dy * dy < this.radius * this.radius){
          // Point within circle, check map
          if(!passThrough.includes(this.map[newX][newY])){
            // Cannot pass through point, return false
            return false;
          }
        }
      }
    }
    return true;
  }

  seekNewTarget(){
    let randX = Math.random() * (Display.width - PADDING * 2) + PADDING;
    let randY = Math.random() * (Display.height - PADDING * 2) + PADDING;
    this.targetX = randX;
    this.targetY = randY;
  }

  update(){
    if(this.immunity > 0){
      this.immunity--;
    }
    if(this.state == STATE_STOPPED){
      this.stopTime--;
      if(this.stopTime <= 0){
        this.seekNewTarget();
        this.state = STATE_MOVING;
      }
    }
    else if(this.state == STATE_MOVING){
      let oldX = this.x;
      let oldY = this.y;
      let dx = this.targetX - oldX;
      let dy = this.targetY - oldY;
      let dist = Math.sqrt(dx * dx + dy * dy);
      this.x = oldX + dx/dist * MOVESPEED;
      this.y = oldY + dy/dist * MOVESPEED;
      if(dist < TARGET_DIST || !this.checkCollision()){
        this.x = oldX;
        this.y = oldY;
        this.state = STATE_STOPPED;
        if(dist < TARGET_DIST){
          this.stopTime = STOP_TIME;
        }
        else{
          this.stopTime = 1;
        }
      }
    }
  }

  fillColor(){
    if(this.virus == VIRUS_BASIC){
      return 'rgb(255, 127, 127)';
    }
    else if(this.virus == VIRUS_INCURABLE){
      return 'rgb(255, 0, 0)'
    }
    return 'rgb(255, 255, 255)';
  }

  destroy(){
    if(this.virus > VIRUS_NONE){
      infectedCount--;
    }
    totalCount--;
  }
}

//var city = new Array(WIDTH);
function setupCity(context){
  //Populates the array with all 0's representing land
  //for (let i = 0; i < WIDTH; i++){
  //    city[i] = new Array(HEIGHT);
  //}
  //Populating the river in the middle of the array
  /*for (let i = 0; i < WIDTH; i++){
    for (let j = 0; j < HEIGHT; j++){
      if ((i > HALF_MAP - RIVER_WIDTH/2) && (i < HALF_MAP + RIVER_WIDTH/2)){
        if ((j > HALF_MAP * 0.5 - BRIDGE_WIDTH/2) && (j < HALF_MAP * 0.5 + BRIDGE_WIDTH/2)){
          city[i][j] = 0;
        }
        else if ((j > HALF_MAP * 1.5 - 20) && (j < HALF_MAP * 1.5 + 20)){
          city[i][j] = 0;
        }
        else{
          city[i][j] = 1;
        }
      }
      else{
        city[i][j] = 0;
      }
    }
  }*/
  /*toArray.loadPixels();
  let pixels = toArray.pixels;
  for(let i = 0; i < WIDTH; i++){
    for(let j = 0; j < HEIGHT; j++){
      let r = pixels[(j * WIDTH + i) * 4 + 0];
      let g = pixels[(j * WIDTH + i) * 4 + 1];
      let b = pixels[(j * WIDTH + i) * 4 + 2];
      let a = pixels[(j * WIDTH + i) * 4 + 3];
      //console.log(r + ';' + g + ';' + b + ';' + a);
      if(b == 236){
        city[i][j] = 1;
      }
      else{
        city[i][j] = 0;
      }
      //city[i][j] = 0;
    }
  }
  var fs = require('fs');

  var file = fs.createWriteStream('island.txt');
  file.on('error', function(err) {});
  city.forEach(function(v) { file.write(v.join(', ') + '\n'); });
  file.end();
  */
  island = setupMap(context, islandStr);
  city = setupMap(context, cityStr);
}

function setupMap(context, path){
  /*let fs = require('fs');
  let array = fs.readFileSync(path).toString().split('\n');
  */

  //let strings = context.loadStrings(path);
  let strings = path;
  let array = [];
  for(let i = 0; i < HEIGHT; i++){
    array.push(strings[i]);
  }
  //let array = dataStr.split(';');
  return array.map(function(v) {
    return v.split(',').map(function(w) {
      return parseInt(w);
    });
  });
}

function reset(num){
  infectedCount = 0;
  totalCount = 0;
  //0: city
  //1: islands
  mapNum = num;
  if(mapNum == 1){
    map = island;
    bg = islandBg;
  }
  else{
    map = city;
    bg = cityBg;
  }

  setupPeople();
}

function nextMap(mapNum){
  if(mapNum == 1){
    return 0;
  }
  else{
    return 1;
  }
}

function setupPeople(){

  people = [];

  //people.push(new Person(map, 100, 100, 5, VIRUS_INCURABLE));

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
  }

  if(mapNum == 1){
    let infectX = getRandomInt(0, 576);
    let infectY = getRandomInt(0, 576);
    for(let i = 0; i < 3; i++){
      let p = new Person(map, infectX, infectY, 5, VIRUS_BASIC);
      if(p.checkCollision()){
        people.push(p);
      }
      else{
        i--;
        p.destroy();
      }
    }
    for(let i = 0; i < 30; i++){
      let p = new Person(map, getRandomInt(0, 576), getRandomInt(0,576), 5, VIRUS_NONE);
      if(p.checkCollision()){
        people.push(p);
      }
      else{
        i--;
        p.destroy();
      }
    }
  }
  else{
    let infectX = getRandomInt(0, 576);
    let infectY = getRandomInt(0, 576);
    for(let i = 0; i < 3; i++){
      let p = new Person(map, infectX, infectY, 5, VIRUS_BASIC);
      if(p.checkCollision()){
        people.push(p);
      }
      else{
        i--;
        p.destroy();
      }
    }

    /*Populates the farmland */
    for(let i = 0; i < 10; i++){
      let p = new Person(map, getRandomInt(0, 250), getRandomInt(0,576), 5, VIRUS_NONE);
      if(p.checkCollision()){
        people.push(p);
      }
      else{
        i--;
        p.destroy();
      }
    }

    /*Populates the city */
    for(let i = 0; i < 20; i++){
      let p = new Person(map, getRandomInt(350, 576), getRandomInt(0,300), 5, VIRUS_NONE);
      if(p.checkCollision()){
        people.push(p);
      }
      else{
        i--;
        p.destroy();
      }
    }
  }
}

pb.preload = function (p) {
  islandBg = this.loadImage("images/islands.png");
  cityBg = this.loadImage("images/city.png");
  islandStr = this.loadStrings('http://assisstion.github.io/data/infection/island.csv');
  cityStr = this.loadStrings('http://assisstion.github.io/data/infection/city.csv');
  //toArray = this.loadImage("images/islands.png");
}

pb.setup = function (p) {
  setupCity(this);
  reset(1);
};

pb.draw = function (floor, p) {

  this.clear();

  let currUsers = floor.users;

  this.background(bg);

  this.stroke(0);

  //draw users at current coordinates
  for (let user of currUsers) {
    pb.drawUser(user);
  }

  for(let person of people){
    //Draw targets
    //this.fill('red');
    //this.ellipse(person.targetX, person.targetY, person.radius * 2, person.radius * 2);
    //Draw people
    this.fill(person.fillColor());
    this.ellipse(person.x, person.y, person.radius * 2, person.radius * 2);
    for(let user of currUsers){
      person.checkCureCollision(user.x, user.y);
    }
    //Update people position
    person.update();
  }
  //Check people to people collision
  for(let i = 0; i < people.length; i++){
    for(let j = i + 1; j < people.length; j++){
      people[i].checkPersonCollision(people[j]);
    }
  }

  this.fill('white');
  this.text("Infected: " + infectedCount, 20, 20);
  this.text("Cured: " + (totalCount - infectedCount), 20, 40);

  if(infectedCount == totalCount){
    reset(nextMap(mapNum));
  }
  else if(infectedCount == 0){
    reset(nextMap(mapNum));
  }
};


export const behavior = {
  title: "Infection",
  init: pb.init.bind(pb),
  frameRate: FPS,
  render: pb.render.bind(pb),
  //numGhosts: 2,
  //ghostBounds: {x: Display.width/4, y: Display.height/4, width: Display.width/2, height: Display.height/2}
};
export default behavior
