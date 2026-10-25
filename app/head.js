/* Runs before the editor: this program keeps its own browser storage (autosave, modules, settings), so opening
   it next to the main program from the same place never overwrites the main program's work. */
(function(){
  var P="cl.", S=Storage.prototype, g=S.getItem, s=S.setItem, r=S.removeItem;
  S.getItem=function(n){ return g.call(this, P+n); };
  S.setItem=function(n,v){ return s.call(this, P+n, v); };
  S.removeItem=function(n){ return r.call(this, P+n); };
  window.CIRCUIT_LIBRARY=true;
})();
