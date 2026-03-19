const CACHE_NAME = 'mobileJobTrack-sw-v34';
const FILES_TO_CACHE = [
'index.html',
'css/index.css',
'css/bootstrap.min.css',
'js/index.js',
'js/pdf.mjs',
'js/pdf.worker.mjs',
'js/bootstrap.min.js',
'img/icoClose.png', 
'img/del.png', 
'img/downArrow.png', 
'img/btnPhoto.png'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(FILES_TO_CACHE.map(resource => {
        return fetch(resource, {cache: 'no-cache'}).then(response => {
          if (response.status === 200) {
            return cache.put(resource, response);
          }
        });
      })).then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName &&  cacheName.startsWith("mobileJobTrack-sw")) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim().then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.navigate(client.url);
          });
        });
      });
    })
  );
});

/* Serve cached content when offline */
self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request)
      .then(function(response) {
          return response || fetch(e.request);
      })
      .catch(function(err) {
          console.log(err);
      })
    );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

/*self.addEventListener('sync', function(event) {
    console.log('Sync Fire');
    if (event.tag === 'backSync') {
      event.waitUntil(
          (async () => {
            const indexDB = new IndexDB();
            const allDB = await indexDB.getAll({storeName:"backSync"});
            for (let [key, value] of Object.entries(allDB)) {
              try {
                await sendDataToServer(value.key); // or pass full value if needed
              } catch (err) {
                throw new Error("Connection failed — sync will retry later");

                // Optionally: retry logic or leave entry for next sync
              }
            }

            // All entries processed — resolve to clear the tag
            console.log("Sync complete");
          })()
      );
    }
});

function sendDataToServer(key) {
  // You can create a fetch request with data to send to your PHP file
  // For example, sending JSON data to a PHP file using a POST request:
  return new Promise((resolve, reject) => {
      const indexDB = new IndexDB();
      const dbID = parseInt(key);

      indexDB.get({storeName:"tokens", key:"deviceToken"}).then((deviceToken) => {
          console.log(deviceToken);
          indexDB.get({storeName:"backSync", key:dbID}).then((dbData) => {
              let formData = new FormData();
              formData.append("formData", dbData.formData);
              formData.append("action", dbData.action);
              formData.append("deviceToken", deviceToken.token);
              console.log(formData);
              fetch('php/private.php', {
                method: 'POST',
                body: formData,
              })
              .then(function(res) {
                if (res.ok) {
                    console.log("fetch good");
                    return res.json();
                }else{
                    console.log('fetch error');
                    throw res.status;
                }
              }).then((res) => {
                  console.log(res);
                  if (res.hasOwnProperty("success")) {
                      console.log('fetch has success');
                      indexDB.delete({storeName:"backSync", key:dbID}).then((del) =>{
                        console.log(del);
                      });
                      resolve();
                  }else{
                      console.log('fetch has error');
                      saveError({dbData:dbData, error:res.error}).then((saveError) => {
                          console.log('Saved Error');
                      }).catch((saveError) => {
                          console.log('Could not save Error');
                          console.log(saveError);
                      });
                      indexDB.delete({storeName:"backSync", key:dbID}).then((del) =>{
                        console.log(del);
                      });
                      resolve();
                  }
              }).catch(function(error) {
                  console.log(error);
                  reject();
              });
          }).catch((err) => {
              console.log(err);
              resolve();
          });

      });

  });


}

function saveError(param) {
    return new Promise((resolve, reject) => {
        let formData = new FormData(), header = {}, fields = {};
      
        header.name = "saveError";
        fields.data = JSON.stringify(param.dbData);
        fields.error = param.error;
        formData.append("formData", JSON.stringify({header:header, fields:fields}));
        formData.append("action", "saveData");
        formData.append("userToken", param.dbData.userToken);
        fetch('php/private.php', {
          method: 'POST',
          body: formData,
        })
        .then(function(res) {
            resolve();
        }).catch(function(error) {
            reject();
        });
    });

}

class IndexDB{
    constructor() {
        this.databaseName = "jobTrackDB";
        this.db = null;
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.databaseName, 1);
    
          request.onerror = () => {
            reject(request.error);
          };
    
          request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
          };
    
        });
    }

    insert(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
            await this.openDatabase();
        }
        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);
        const request = store.add(param.data);

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          reject(`Failed to insert data: ${event.target.error}`);
        };
      });
    }

    get(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }

        const transaction = this.db.transaction(param.storeName, 'readonly');
        const store = transaction.objectStore(param.storeName);

        const request = store.get(param.key);

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });
    }

    getAll(param) {
        return new Promise(async (resolve, reject) => {
          if (!this.db) {
            await this.openDatabase();
          }
    
          const transaction = this.db.transaction(param.storeName, 'readonly');
          const store = transaction.objectStore(param.storeName);
    
          const request = store.getAll();
    
          request.onsuccess = (event) => {
              resolve(event.target.result);
          };
    
          request.onerror = (event) => {
            reject(`Failed to get data: ${event.target.error}`);
          };
        });
    }

    delete(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }

        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);

        const request = store.delete(param.key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          reject(`Failed to delete data: ${event.target.error}`);
        };
      });
    }

    put(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }

        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);

        const request = store.put(param.data);

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });

    }

    clear(param) {
      return new Promise(async (resolve, reject) => {
        if (!this.db) {
          await this.openDatabase();
        }

        const transaction = this.db.transaction(param.storeName, 'readwrite');
        const store = transaction.objectStore(param.storeName);

        const request = store.clear();

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          reject(`Failed to get data: ${event.target.error}`);
        };
      });
    }
}*/
