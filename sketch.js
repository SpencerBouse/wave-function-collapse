const sampleImageDimension = 16

const imageDimension = 32
const gridWidth = 15
const gridHeight = 10

const grid = []
const tiles = []

let sampleImage;
let leftCanvas;
let rightCanvas;

let error = false;

// object tile derived from sample image
class Tile{
  constructor(image, tileNum, rules, frequency){
    this.image = image,
    this.tileNum = tileNum,
    this.rules = rules,
    this.frequency = frequency
  }
}

// cell in final grid, tile === object tile
class Cell{
  constructor(availableChoices, x,y){
    this.tile = null,
    this.availableChoices = availableChoices,
    this.x = x,
    this.y = y
  }
}

function preload(){
  // tiles[0] = new Tile(loadImage('./ref/blank.png'), 'blank', [0,0,0,0])
  // tiles[1] = new Tile(loadImage('./ref/up.png'), 'up', [1,1,0,1])
  // tiles[2] = new Tile(loadImage('./ref/right.png'), 'right', [1,1,1,0])
  // tiles[3] = new Tile(loadImage('./ref/down.png'), 'down', [0,1,1,1])
  // tiles[4] = new Tile(loadImage('./ref/left.png'), 'left', [1,0,1,1])

  sampleImage = loadImage('./ref/sampleNewCorners.png');
}

function setup() {
  createCanvas((imageDimension*gridWidth)*2,imageDimension*gridHeight);
  leftCanvas = createGraphics(imageDimension*gridWidth, imageDimension*gridHeight)
  rightCanvas = createGraphics(imageDimension*gridWidth, imageDimension*gridHeight)

  createTilesFromImage(sampleImage, tiles)
  buildGrid(tiles,grid)

  // fill tiles till all have value, go till collapsed, go till wave function is collapsed
  for(let i=0;i<grid.length;i++){
    if(error) break;
    setTimeout(() => {
      collapseLowestEntropyTile(grid,tiles)
    }, i*50);
  }
}

function draw() {
  drawLeftCanvas()
  drawRightCanvas()

  image(leftCanvas, 0,0)
  image(rightCanvas, imageDimension*gridWidth, 0)
}

function drawLeftCanvas() {
  const xInTiles = sampleImage.width/sampleImageDimension
  const yInTiles = sampleImage.height/sampleImageDimension
  noSmooth()
  image(sampleImage, 0, 100, imageDimension*xInTiles, imageDimension*yInTiles)
}

function drawRightCanvas() {
  // loop grid and render
  grid.forEach((cell)=>{
    if(cell.tile){
      image(cell.tile.image, cell.x + imageDimension*gridWidth, cell.y, imageDimension, imageDimension)
    }
  })
}

function createTilesFromImage(image, tileSet){
  // build sample tile grid
  image.loadPixels()
  const xInTiles = image.width/sampleImageDimension
  const yInTiles = image.height/sampleImageDimension
  const tempTiles = []

  // split image and push into array
  let c=0;
  for(let y=0;y<yInTiles; y++){
    for(let x=0;x<xInTiles; x++){
      const tileImage = image.get(x*sampleImageDimension,y*sampleImageDimension,sampleImageDimension,sampleImageDimension) 
      let tileNumber = c;
      
      tileImage.loadPixels()
      if(tempTiles.find(tile=> JSON.stringify(tile.image.pixels) === JSON.stringify(tileImage.pixels))){
        tileNumber = tempTiles.find(tile=> JSON.stringify(tile.image.pixels) === JSON.stringify(tileImage.pixels)).tileNum
      }else{
        c++
      }
      
      tempTiles.push(new Tile(tileImage, tileNumber, [], 0))
    }
  }

  //define rules for tiles based on its neighbors in sample image
  tempTiles.forEach((cell,index) => {
    const neighborIndexes = [
      index+1 - xInTiles > 0 ? index - xInTiles : null, // top index
      (index+1) % xInTiles !== 0 ? index+1 : null,  // right index
      index+1 + xInTiles <= xInTiles * yInTiles ? index + xInTiles : null, // bottom index
      (index+1) % xInTiles !== 1 ? index-1 : null // left index
    ]

    /* 
      rules are tileNum of neighbors pushed into rule array based on postion
      cell.rules = [
        [top rules],
        [right rules],
        [bottom rules],
        [left rules]
      ]
    */
   
    neighborIndexes.forEach(index => {
      cell.rules.push(index ? [tempTiles[index].tileNum] : []);
    })
    
    // if tile with same tileNum exists, add new rules to that tile
    let existingTile = tileSet.find(tile=> JSON.stringify(tile.image.pixels) === JSON.stringify(cell.image.pixels));

    if(existingTile){
      existingTile.frequency++;
      cell.rules.forEach((rule, i)=>{
        rule.forEach(subRule=>{
          if(!existingTile.rules[i].includes(subRule)){
            existingTile.rules[i].push(subRule);
          }
        })
      })
    }else{
      tileSet.push(cell);
    }
  })

}

function buildGrid(tiles,grid){
    // build grid array based on grid dimensons and tiles rules for available choices
    let availableChoicesArray = []
    tiles.forEach(tile=>{
      availableChoicesArray.push(tile.tileNum)
    })
  
    for(let i=0;i<gridWidth*gridHeight;i++){
      grid[i] = new Cell(availableChoicesArray, (i%gridWidth)*imageDimension, Math.floor(i/gridWidth)*imageDimension)
    }
}



function collapseLowestEntropyTile(grid, tiles){
  // get tile with lowest entropy at random, where till hasnt been filled
  let gridCopy = grid.slice()
  gridCopy = gridCopy.filter(tile => !tile.tile ).sort((a,b)=>{ return a.availableChoices.length - b.availableChoices.length})
  gridCopy = gridCopy.filter(tile => tile.availableChoices.length === gridCopy[0].availableChoices.length)
  const collapsedTile = gridCopy[Math.floor(Math.random() * gridCopy.length)]

  // get and set random tileNum from available choices
  const weightedArr = randomWeightedChoice(collapsedTile.availableChoices, tiles)
  const randomChoice = weightedArr[Math.floor(Math.random() * weightedArr.length)]
  // const randomChoice = collapsedTile.availableChoices[Math.floor(Math.random() * collapsedTile.availableChoices.length)]
  collapsedTile.tile = tiles.find(tile=> tile.tileNum === randomChoice)

  // update neighbors availableChoices
  const tileIndex = grid.indexOf(collapsedTile)
  const neighborIndexes = [
    tileIndex+1 - gridWidth > 0 ? tileIndex - gridWidth : null, // top index
    (tileIndex+1) % gridWidth !== 0 ? tileIndex+1 : null,  // right index
    tileIndex+1 + gridWidth <= gridWidth * gridHeight ? tileIndex + gridWidth : null, // bottom index
    (tileIndex+1) % gridWidth !== 1 ? tileIndex-1 : null // left index
  ]
  // reverse postion arr, when updating tile above, it should update that tiles below rules etc.
  const reversePostionArr = [2,3,0,1]

  neighborIndexes.forEach((index, i) => {
    if(grid[index]){
      if(collapsedTile.tile){
        let newChoices = grid[index].availableChoices.filter(choice=> collapsedTile.tile.rules[i].includes(choice))
        if(!newChoices.length){
          console.log(collapsedTile.tile.rules[i])
          console.log(grid[index].availableChoices)
          console.log(tileIndex)
          error = true;
        }else{
          grid[index].availableChoices = newChoices
        }
      }else{
        console.log(collapsedTile)
        console.log(tileIndex)
        error = true;
      }
    }
  })
}

function randomWeightedChoice(items, tiles){
  const weightedArr = [];

  items.forEach(item=>{
    const option = tiles.find(tile=> tile.tileNum === item)
    for(let i=0; i<option.frequency;i++){
      weightedArr.push(option.tileNum)
    }
  })

  return weightedArr;
}