(function () {

/*** Variables ***/

  var 
    hasShadow = Element.prototype.createShadowRoot;

/*** Functions ***/

// Pseudos

  

// Mixins

  
// Events

 

// Accessors

  
  

/*** X-Tag Object Definition ***/

  var xtag = {
    /* Exposed Variables */
    
    
    
    /* DOM, load dom class */
    

    /* UTILITIES, load utilities class */

    /* PSEUDOS */


  /*** Events ***/


};

  if (typeof define === 'function' && define.amd) define(xtag);
  else if (typeof module !== 'undefined' && module.exports) module.exports = xtag;
  else win.xtag = xtag;

  doc.addEventListener('WebComponentsReady', function(){
    xtag.fireEvent(doc.body, 'DOMComponentsLoaded');
  });

})();
