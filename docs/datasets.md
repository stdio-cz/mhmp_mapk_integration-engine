# Datové sady Integračního enginu Golemio

Poslední úprava: 17. 6. 2019

## AirQualityStations
- zdroj: ČHMU http://portal.chmi.cz/files/portal/docs/uoco/web_generator/AIMdata_hourly.xml
- typ: PULL
- obnova dat: 1x za hodinu
- historizace: ano
- retence: TBD

## BicycleParkings
- zdroj: OpenStreeMap https://overpass-api.de/api/interpreter/?data=[out:json];(node[amenity=bicycle_parking](poly:%2750.1785%2014.5295%2050.152266272562684%2014.37286376953125%2050.1131%2014.2053%2049.9327%2014.342%2049.9954%2014.6619%2050.0902%2014.7279%2050.1785%2014.5295%27););out;
- typ: PULL
- obnova dat: 1x týdně
- historizace: ne
- retence: TBD

## CityDistricts
- zdroj: IPR Geoportál http://opendata.iprpraha.cz/CUR/DTMP/TMMESTSKECASTI_P/WGS_84/TMMESTSKECASTI_P.json
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD

## Gardens
- zdroj: vlastní zdroj https://www.mojepraha.eu/api/gardens
- typ: PULL
- obnova dat: 1x týdně
- historizace: ne
- retence: TBD

## IceGatewaySensors
- zdroj: IceGateway https://prague-city.ice-gateway.com/iceapi/v1/iot/data/all/?per_page=200
- typ: PULL
- obnova dat: 1x za 15min
- historizace: ano
- retence: TBD

## IceGatewayStreetLamps
- zdroj: IceGateway https://prague-city.ice-gateway.com/iceapi/v1/streetlamps/
- typ: PULL
- obnova dat: 1x za 15min
- historizace: ne
- retence: TBD

## MedicalInstitutions
- zdroje:
  - MZČR https://opendata.mzcr.cz/data/nrpzs/narodni-registr-poskytovatelu-zdravotnich-sluzeb.csv
  - SÚKL https://opendata.sukl.cz/soubory/SODERECEPT/LEKARNYAKTUALNI.zip
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD

## MerakiAccessPoints
- zdroj: input-gateway
- typ: INPUT
- obnova dat: cca 1x za 20vteřin
- historizace: ne
- retence: 2dny

## Meteosensors
- zdroj: TSK http://www.tsk-praha.cz/tskexport3/json/meteosensors
- typ: PULL
- obnova dat: 1x za 5min
- historizace: ano
- retence: TBD

## MunicipalAuthorities
- zdroje:
  - vlastní zdroj https://www.mojepraha.eu/api/municipal-authorities
  - Praha http://jungmannova.webcall.praha.eu/mon/wc-mon.php (fronty)
- typ: PULL
- obnova dat: 1x týdně, 1x za 2min
- historizace: ano (fronty)
- retence: TBD

## MunicipalPoliceStations
- zdroj: IPR Geoportál http://opendata.iprpraha.cz/CUR/FSB/BEZ_ObjektMPP_b/WGS_84/BEZ_ObjektMPP_b.json
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD

## ParkingZones
- zdroje:
  - IPR Geoportál http://opendata.iprpraha.cz/CUR/DOP/DOP_ZPS_USEKY_p/WGS_84/DOP_ZPS_USEKY_p.json
  - TSK https://vph.zpspraha.cz/api/v1/section/code/"
- typ: PULL
- obnova dat: 1x denně
- historizace: ne
- retence: TBD

## Parkings
- zdroje:
  - TSK http://www.tsk-praha.cz/tskexport3/json/parkings
  - MPLA input-gateway (zaplněnost)
- typ: PULL + INPUT
- obnova dat: 1x za 5min + cca 1x za minutu
- historizace: ano (zaplněnost)
- retence: TBD

## Playgrounds
- zdroj: Hřiště Praha http://www.hristepraha.cz/api/get-all-items?type=hriste
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD

## PublicToilets
- zdroj: IPR Geoportál http://opendata.iprpraha.cz/CUR/FSV/FSV_VerejnaWC_b/WGS_84/FSV_VerejnaWC_b.json
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD

## RopidGTFS
- zdroj: Ropid FTP
- typ: PULL
- obnova dat: cca 1x denně
- historizace: ne
- retence: TBD

## SharedBikes
- zdroje:
  - Rekola https://www.rekola.cz/api/mobile/regions/1/trackables?mapLat=0&mapLng=0&mapZoom=0&gpsLat=0&gpsLng=0&gpsAcc=0
  - Homeport https://tkhs-freebikeprague.cloudapp.net/Services/Api/...
- typ: PULL
- obnova dat: 1x za 2min
- historizace: ne
- retence: drží se jen aktuální polohy kol

## SharedCars
- zdroje:
  - ČeskýCarsharing https://api.ceskycarsharing.cz/iis_cs_api/IIS_API.svc/getAllCarsIct
  - HoppyGo https://www.hoppygo.com/api/v1/exports/cars_search
- typ: PULL
- obnova dat: 1x za 2min
- historizace: ne
- retence: drží se jen aktuální polohy aut

## SortedWasteStations
- zdroje:
  - IPR Geoportál http://opendata.iprpraha.cz/CUR/ZPK/ZPK_O_Kont_TOitem_b/WGS_84/ZPK_O_Kont_TOitem_b.json (stanoviště)
  - IPR Geoportál http://opendata.iprpraha.cz/CUR/ZPK/ZPK_O_Kont_TOstan_b/WGS_84/ZPK_O_Kont_TOstan_b.json (kontejnery)
  - vlastní zdroj https://www.mojepraha.eu/api/sorted-waste-stations
  - POTEX http://www.recyklujemetextil.cz/Api/places.json
  - Sensoneo http://prodapiv1.sensoneo.com/data
- typ: PULL
- obnova dat: 1x denně, 1x za 30min (sensoneo)
- historizace: ano (sensoneo)
- retence: TBD

## TrafficCameras
- zdroj: TSK http://www.tsk-praha.cz/tskexport3/json/cameras
- typ: PULL
- obnova dat: 1x za 2min
- historizace: ano
- retence: půl dne

## VehiclePositions
- zdroj:
- typ: PULL
- obnova dat:
- historizace: ano
- retence: TBD

## WasteCollectionYards
- zdroj: IPR Geoportál http://opendata.iprpraha.cz/CUR/ZPK/ZPK_O_SberOdpadu_b/WGS_84/ZPK_O_SberOdpadu_b.json
- typ: PULL
- obnova dat: 1. den v měsíci
- historizace: ne
- retence: TBD
