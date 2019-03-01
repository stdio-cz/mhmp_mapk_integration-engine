# Datové sady pro prototyp Integračního enginu Datové platformy

Poslední úprava: 28. 2. 2019

## Přehled datových sad

- Městské části (CityDistricts)
- Ice Gateway Senzory (IceGatewaySensors)
- Ice Gateway Lampy (IceGatewayStreetLamps)
- Meraki (MerakiAccessPoints)
- Parkoviště (Parkings)
- Zóny parkování (ParkingZones)
- Jízdní řády (RopidGTFS)
- Polohy vozů (VehiclePositions)
- Dopravní kamery (TrafficCameras)

## Městské části (CityDistricts)

Provizorní datová sada, která v prototypu bude sloužit hlavně pro obohacení Geo dat o městskou část.

- název: `CityDistricts`
- schema-definitions: `CityDistricts`
- datový zdroj: geoportal.praha.eu
- obnova dat: 1x měsíčně
- historizace: ne
- databáze:
  - typ: MongoDB
  - název kolekce: `citydistricts`
- RabbitMQ fronty:
  - `*.[exchangeName].citydistricts.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - nerozesílá žadné další zprávy

## Ice Gateway Senzory (IceGatewaySensors)

- název: `IceGatewaySensors`
- schema-definitions: `IceGatewaySensors`
- datový zdroj: prague-city.ice-gateway.com
- obnova dat: 1x za 5 minut
- historizace: ano
- databáze:
  - typ: MongoDB
  - názvy kolekcí: `icegatewaysensors`, `icegatewaysensors_history`
- RabbitMQ fronty:
  - `*.[exchangeName].icegatewaysensors.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - po zpracování odešle zprávu k uložení historie
  - `*.[exchangeName].icegatewaysensors.saveDataToHistory`
    - přijímá data a vkládá do DB
    - nerozesílá žadné další zprávy

## Ice Gateway Lampy (IceGatewayStreetLamps)

- název: `IceGatewayStreetLamps`
- schema-definitions: `IceGatewayStreetLamps`
- datový zdroj: prague-city.ice-gateway.com
- obnova dat: 1x za 15 minut
- historizace: ne
- databáze:
  - typ: MongoDB
  - název kolekce: `icegatewaystreetlamps`
- RabbitMQ fronty:
  - `*.[exchangeName].icegatewaystreetlamps.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].icegatewaystreetlamps.setDimValue`
    - přijímá data ze zprávy a posílá request pro ovládání lampy
    - nerozesílá žadné další zprávy

## Meraki (MerakiAccessPoints)

- název: `MerakiAccessPoints`
- schema-definitions: `MerakiAccessPoints`
- datový zdroj: data-platform-input-gateway
- databáze:
  - typ: Postgres SQL
  - názvy tabulek: `merakiaccesspoints_observations`, `merakiaccesspoints_tags`
- RabbitMQ fronty:
  - `*.[exchangeName].merakiaccesspoints.saveDataToDB`
    - přijímá data ze zprávy a uloží je do DB
    - nerozesílá žadné další zprávy

## Parkoviště (Parkings)

- název: `Parkings`
- schema-definitions: `Parkings`
- datový zdroj: tsk-praha.cz
- obnova dat: 1x za 5 minut
- historizace: ano
- databáze:
  - typ: MongoDB
  - názvy kolekcí: `parkings`, `parkings_history`
- RabbitMQ fronty:
  - `*.[exchangeName].parkings.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - po zpracování odešle zprávu k uložení historie
    - po zpracování odešle zprávy k obohacení dat o adresu a MČ
  - `*.[exchangeName].parkings.saveDataToHistory`
    - přijímá data a vkládá do DB
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].parkings.updateAddressAndDistrict`
    - přijímá data a obohacuje záznamy o adresu a MČ
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].parkings.updateAverageOccupancy`
    - přijímá data a obohacuje záznamy o průměrné obsazenosti
    - nerozesílá žadné další zprávy

## Zóny parkování (ParkingZones)

- název: `ParkingZones`
- schema-definitions: `ParkingZones`
- datový zdroj: geoportal.praha.eu
- obnova dat: 1x denně
- historizace: ne
- databáze:
  - typ: MongoDB
  - název kolekce: `parkingzones`
- RabbitMQ fronty:
  - `*.[exchangeName].parkingzones.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - nerozesílá žadné další zprávy

## Jízdní řády (RopidGTFS)

- název: `RopidGTFS`
- schema-definitions: `RopidGTFS`
- datový zdroj: Ropid FTP
- obnova dat: 1x denně
- historizace: ne
- databáze:
  - typ: Postgres SQL
  - názvy tabulek: `ropidgtfs_agency`, `ropidgtfs_calendar`, `ropidgtfs_calendar_dates`, `ropidgtfs_routes`, `ropidgtfs_shapes`, `ropidgtfs_stop_times`, `ropidgtfs_stops`, `ropidgtfs_trips`
- RabbitMQ fronty:
  - `*.[exchangeName].ropidgtfs.checkForNewData`
    - nepřijímá žádná data
    - kontroluje jestli se datové zdroje změnily
    - po zpracování odešle zprávy ke stažení nových dat
  - `*.[exchangeName].ropidgtfs.downloadFiles`
    - nepřijímá žádná data
    - stáhne soubor z FTP a rozbalího do fs
    - po zpracování odešle zprávy k transformaci dat (počet zpráv = počet souborů = počet tabulek)
    - po zpracování odešle zprávu pro kontrolu dokončení transformací a uložení
  - `*.[exchangeName].ropidgtfs.downloadCisStops`
    - nepřijímá žádná data
    - stáhne soubor z FTP a rozbalího do fs, transformuje a uloží data
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].ropidgtfs.transformData`
    - přijímá data ze zprávy
    - načte soubor z fs a transformuje data
    - po zpracování odešle zprávy k uložení dat
  - `*.[exchangeName].ropidgtfs.saveDataToDB`
    - přijímá data ze zprávy a uloží do DB
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].ropidgtfs.checkingIfDone`
    - nepřijímá žádná data
    - kontroluje zda jsou fronty `transformData` a `saveDataToDB` prázdné, pokud ne, uspí se na 5 vteřin a vrátí zprávu zpět do fronty, pokud ano, zkontroluje tabulky a přehodí data z tmp do prod tabulek a pošle ack
    - po zpracování odešle zprávu pro obnovu dat pro výpočet zpoždění
  - `*.[exchangeName].ropidgtfs.refreshDataForDelayCalculation`
    - nepřijímá žádná data
    - načte data z DB a transformuje je
    - po zpracování odešle zprávy k uložení dat
  - `*.[exchangeName].ropidgtfs.saveDataForDelayCalculation`
    - přijímá data ze zprávy a uloží do DB
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].ropidgtfs.checkingIfDoneDelayCalculation`
    - nepřijímá žádná data
    - kontroluje zda je fronta `saveDataForDelayCalculation` prázdná, pokud ne, uspí se na 5 vteřin a vrátí zprávu zpět do fronty, pokud ano, zkontroluje tabulky a přehodí data z tmp do prod tabulek a pošle ack
    - nerozesílá žadné další zprávy

## Polohy vozů (VehiclePositions)

- název: `VehiclePositions`
- schema-definitions: `VehiclePositions`
- datový zdroj: data-platform-input-gateway
- databáze:
  - typ: Postgres SQL
  - názvy tabulek: `vehiclepositions_stops`, `vehiclepositions_trips`
- RabbitMQ fronty:
  - `*.[exchangeName].vehiclepositions.saveDataToDB`
    - přijímá data ze zprávy a uloží je do DB
    - odesílá zprávy k uložení zastávek, k dohledání trip_id a dopočítání zpožedění
  - `*.[exchangeName].vehiclepositions.saveStopsToDB`
    - přijímá data ze zprávy a uloží je do DB
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].vehiclepositions.updateGTFSTripId`
    - přijímá data ze zprávy, dohledá trip_id a uloží ho
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].vehiclepositions.updateDelay`
    - přijímá data ze zprávy, dopočítá zpoždění a uloží ho
    - nerozesílá žadné další zprávy

## Dopravní kamery (TrafficCameras)

- název: `TrafficCameras`
- schema-definitions: `TrafficCameras`
- datový zdroj: tsk-praha.cz
- obnova dat: 1x za 2 minuty
- historizace: ano
- databáze:
  - typ: MongoDB
  - názvy kolekcí: `trafficcameras`, `trafficcameras_history`
- RabbitMQ fronty:
  - `*.[exchangeName].trafficcameras.refreshDataInDB`
    - nepřijímá žádná data, pouze update ze zdroje
    - po zpracování odešle zprávu k uložení historie
    - po zpracování odešle zprávy k obohacení dat o adresu a MČ
  - `*.[exchangeName].trafficcameras.saveDataToHistory`
    - přijímá data a vkládá do DB
    - nerozesílá žadné další zprávy
  - `*.[exchangeName].trafficcameras.updateAddressAndDistrict`
    - přijímá data a obohacuje záznamy o adresu a MČ
    - nerozesílá žadné další zprávy
