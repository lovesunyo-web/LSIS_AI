
(function(global){
  'use strict';
  const DB_NAME='ls-cable-full-spec-db', DB_VERSION=1, ITEM_STORE='items', PROJECT_STORE='projects';
  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(ITEM_STORE)) db.createObjectStore(ITEM_STORE,{keyPath:'id'});
        if(!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE,{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function tx(store,mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tr=db.transaction(store,mode), os=tr.objectStore(store);
      let result;
      try{ result=fn(os); }catch(e){ reject(e); return; }
      tr.oncomplete=()=>resolve(result); tr.onerror=()=>reject(tr.error);
    });
  }
  const api={
    async putItem(item){ await tx(ITEM_STORE,'readwrite',os=>os.put(item)); return item; },
    async getItems(){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const req=db.transaction(ITEM_STORE,'readonly').objectStore(ITEM_STORE).getAll();
        req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>(a.order||0)-(b.order||0)));
        req.onerror=()=>reject(req.error);
      });
    },
    async countItems(){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const req=db.transaction(ITEM_STORE,'readonly').objectStore(ITEM_STORE).count();
        req.onsuccess=()=>resolve(Number(req.result)||0);
        req.onerror=()=>reject(req.error);
      });
    },
    async deleteItem(id){ return tx(ITEM_STORE,'readwrite',os=>os.delete(id)); },
    async clearItems(){ return tx(ITEM_STORE,'readwrite',os=>os.clear()); },
    async saveProject(project){ await tx(PROJECT_STORE,'readwrite',os=>os.put(project)); return project; },
    async getProject(id='default'){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const req=db.transaction(PROJECT_STORE,'readonly').objectStore(PROJECT_STORE).get(id);
        req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error);
      });
    }
  };
  global.FullSpecDB=api;
})(window);
