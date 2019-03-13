Pro automatické nahrávání dat do [katalogu OD](http://opendata.praha.eu) lze využít CKAN API.

## Síťové nastavení a poznámky k CKANu

- `10.140.5.2` je adresa z vnitřní sítě OICT, přes kterou se lze dostat na neveřejnou instanci CKANu a používat kompletní API
- adresa http://opendata.praha.eu vede na veřejnou instanci CKANu, která cca v 5min intervalech zrcadlí vnitřní verzi

## Získání metadat a seznamu datových zdrojů pro konkrétní `package_id` 
```javascript
request({
   method: 'GET',
   // Úpravy je nutné dělat skrze vnitřní síť OICT na této IP adrese, nikoliv na veřejné verzi opendata.praha.eu
   // `use_default_schema` pro sdružení nestandardních metadatových polí záznamu pod jeden atribut `extras` a `include_tracking` pro zahrnutí informace o počtu zobrazení / stažení
   url: 'http://10.140.5.2/api/3/action/package_show?id='+package_id+'&use_default_schema=true&include_tracking=true'
})...
```

## Změna, či vytvoření datového zdroje
```javascript
request({
   method: 'POST',

   // VYTVÁŘENÍ NOVÉHO DATOVÉHO ZDROJE
   url: 'http://10.140.5.2/api/3/action/resource_create',
   // UPDATE EXISTUJÍCÍHO DATOVÉHO ZDROJE
   ////url: 'http://10.140.5.2/api/3/action/resource_update',

   headers: {
      'X-CKAN-API-Key': '1af054e5-2db0-4770-9337-d915ba875f56', //API klíč přidělený OICT v CKANu
      'Content-Type': 'multipart/form-data'
   },
   formData: {
      upload: {
         value: fs.createReadStream(filepathgz), //cesta k nahrávenému souboru
         options: {
            filename: filenamegz, //název souboru (volitelné)
            mimetype: 'application/gzip', //MIMETYPE souboru
            contentType: null
         }
      },
      name: name, //viditelný název datového zdroje
      description: description, //viditelný popisek datového zdroje
      format: 'GZIP', //formát souboru (metadatový záznam)
      
      // VYTVÁŘENÍ NOVÉHO DATOVÉHO ZDROJE - nutné specifikovat id datové sady
      package_id: package_id,
      //// UPDATE EXISTUJÍCÍHO DATOVÉHO ZDROJE - nutné specifikovat přímo id datového zdroje
      //id: id,
   }
})...
```

## Současný stav

CKAN API využíváme pro automatické denní aktualizace naměřených dat (parkovací relace a meteoměření z karlínských lamp). Skript ověří v ručně založené datové sadě (`[GET] /package_show` s parametrem `package_id`) existenci datového zdroje se specifickým názvem odpovídajícím dotčenému časovému období (např. `Lampy měření (rok 2018)`) a přepíše datový zdroj, popř. založí nový datový zdroj s odpovídajícím názvem.

## Rozšíření?

- katalog datových sad udržovat také interně - zjišťovat existenci popř. aktualizovat / zakládat nově
- do katalogu ukládat pouze URL odkazy namísto posílání dat (aktualizace dat by pak byla pouze metadatová - naposledy změněno, URL směřující na pozměněný soubor na naše úložišti by zůstávalo stejné)