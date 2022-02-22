# CC-069-Redone
This is a large-scale refactoring of my version of the Coding Train's Coding Challenge 69 - Steering Behaviors

Quite a while a go, I made some changes to the original code of Coding Challenge 69 from the Coding Train. 

The video and code can be found [at this link](https://thecodingtrain.com/CodingChallenges/069.4-steering-evolution.html)

In the video, Dan implements a genetic algorithm together with steering behaviors—which I believe originates with Craig Reynolds 

I made several changes to this code (as is cusotmary for viewers to do with Coding Challenges) and added many things, but most importantly altruism—the ability to share health and food. 
You can find this version [on the web editor](https://editor.p5js.org/tompov227/sketches/NytCY_iQM)

Recently, I was taking a look at this code that I had written from the original Coding Challenge, and I realized that there were things that I wanted to 
change and improve. I decided to move it to a new repository because I **really really** love how my original alterations turned out, and I wanted to make
some very large-scale changes and I really didn't want it to interfere with the original behavior. Ideally, this would not happen anyway, but in the event, my 
refactoring changes any behavior, I wanted to ensure that I would maintain my original changes. 

Some of the things I am doing with this version are 
 -  Changing to ES6 classes
 -  Adding DNA and gene objects instead of using just arrays and numbers
   -  I already did this, but I'm not sure if the API is perfect, I might want to continue working on this
 -  Possibly add some additional genes for other things
   -  possibly separate `otherPerception` which currently is the distance a vehicle can perceive another into separate values for different reasons like helping, reproducing, etc.
 -  Adding more customizability 
   -  for instance, giving each vehicle or even gene their own (possibly controllable) mutation rate instead of it being global
 -  Optimizing the draw loop to be more efficient and logically sound
 -  Condensing some of the actions in the methods of the vehicle class so that they serve single functions
