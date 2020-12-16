"use strict";

import * as _ from "lodash";

import { Energetics, EnergeticsTypes } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import EnesaBuildings = EnergeticsTypes.Enesa.Buildings;

export class EnesaEnergyBuildingsTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.enesa.buildings.name;
    }

    protected transformElement = async (
        element: EnesaBuildings.InputElement,
    ): Promise<EnesaBuildings.OutputElement> => {
        const res: EnesaBuildings.OutputElement = {
            // PK
            id: element.Id,

            address_city: _.toString(element.Address.city),
            address_country: _.toString(element.Address.country),
            address_house_number: _.toString(element.Address.houseNumber),
            address_mail: _.toString(element.Address.mail),
            address_phone: _.toString(element.Address.phone),
            address_street: _.toString(element.Address.street),
            address_web_address: _.toString(element.Address.webAddress),
            allotment_number: _.toString(element.AllotmentNumber),
            beds_count: _.toString(element.BedsCount),
            building_address_code: _.toString(element.BuildingAddressCode),

            // Building envelope - Filling of hole ( ͡° ͜ʖ ͡°)
            building_envelope_filling_of_hole_area: _.toString(element.BuildingEnvelope.fillingOfHole.area),
            building_envelope_filling_of_hole_construction:
                _.toString(element.BuildingEnvelope.fillingOfHole.construction),
            building_envelope_filling_of_hole_technical_condition:
                _.toString(element.BuildingEnvelope.fillingOfHole.technicalCondition),
            building_envelope_filling_of_hole_year_of_adjustment:
                _.toString(element.BuildingEnvelope.fillingOfHole.yearOfAdjustment),
            building_envelope_floor_of_the_lowest_heated_floor_area:

            // Building envelope - Floor of the lowest heated floor
                _.toString(element.BuildingEnvelope.floorOfTheLowestHeatedFloor.area),
            building_envelope_floor_of_the_lowest_heated_floor_construction:
                _.toString(element.BuildingEnvelope.floorOfTheLowestHeatedFloor.construction),
            building_envelope_floor_of_the_lowest_heated_floor_year_of_adjustment:
                _.toString(element.BuildingEnvelope.floorOfTheLowestHeatedFloor.yearOfAdjustment),
            floor_of_the_lowest_heated_floor_technical_condition:
                _.toString(element.BuildingEnvelope.floorOfTheLowestHeatedFloor.technicalCondition),
            floor_of_the_lowest_heated_floor_thermal_insulation:
                _.toString(element.BuildingEnvelope.floorOfTheLowestHeatedFloor.thermalInsulation),

            // Building envelope - Roof
            building_envelope_roof_area: _.toString(element.BuildingEnvelope.roof.area),
            building_envelope_roof_construction: _.toString(element.BuildingEnvelope.roof.construction),
            building_envelope_roof_technical_condition: _.toString(element.BuildingEnvelope.roof.technicalCondition),
            building_envelope_roof_thermal_insulation: _.toString(element.BuildingEnvelope.roof.thermalInsulation),
            building_envelope_roof_year_of_adjustment: _.toString(element.BuildingEnvelope.roof.yearOfAdjustment),

            // Building envelope - Side wall
            building_envelope_side_wall_area: _.toString(element.BuildingEnvelope.sideWall.area),
            building_envelope_side_wall_heat_insulation: _.toString(element.BuildingEnvelope.sideWall.heatInsulation),
            building_envelope_side_wall_prevailing_construction:
                _.toString(element.BuildingEnvelope.sideWall.prevailingConstruction),
            building_envelope_side_wall_technical_condition:
                _.toString(element.BuildingEnvelope.sideWall.technicalCondition),
            building_envelope_side_wall_year_of_adjustment:
                _.toString(element.BuildingEnvelope.sideWall.yearOfAdjustment),

            building_label: _.toString(element.Label),
            building_name: _.toString(element.Name),
            built_up_area: _.toString(element.BuiltUpArea),
            classrooms_count: _.toString(element.ClassroomsCount),
            csu_code: _.toString(element.CSUCode),
            current_note: _.toString(element.CurrentNote),
            description: _.toString(element.Description),
            electricity_consumption_normatives: _.toString(element.ElectricityConsumptionNormatives),
            electricity_consumption_normatives_per_person:
                _.toString(element.ElectricityConsumptionNormativesPerPerson),
            employees_count: _.toString(element.EmployeesCount),
            energetic_management: _.toString(element.EnergeticManagement),

            // Energy Audits
            energy_audits_created_at: _.toString(element.EnergyAudits.createdAt),
            energy_audits_earegistration_number: _.toString(element.EnergyAudits.earegistrationNumber),
            energy_audits_energy_audit: _.toString(element.EnergyAudits.energyAudit),

            eno_id: _.toString(element.ENOId),

            // Fuel and energy
            fuel_and_energy_coal: _.toString(element.FuelAndEnergy.coal),
            fuel_and_energy_czt: _.toString(element.FuelAndEnergy.czt),
            fuel_and_energy_electricity: _.toString(element.FuelAndEnergy.electricity),
            fuel_and_energy_gas: _.toString(element.FuelAndEnergy.gas),
            fuel_and_energy_other: _.toString(element.FuelAndEnergy.other),
            fuel_and_energy_oze: _.toString(element.FuelAndEnergy.oze),

            gas_consumption_normatives: _.toString(element.GasConsumptionNormatives),
            heat_consumption_normatives: _.toString(element.HeatConsumptionNormatives),
            heated_bulding_volume: _.toString(element.HeatedBuldingVolume),
            ku_code: _.toString(element.KUCode),
            latitude: _.toString(element.Latitude),
            link: _.toString(element.Link),
            longitude: _.toString(element.Longitude),
            main_use: _.toString(element.MainUse),
            method_of_protection: _.toString(element.MethodOfProtection),
            opening_hours: _.toString(element.OpeningHours),

            // Oze energy production
            oze_energy_production_heat_pump: _.toString(element.OZEEnergyProduction.heatPump),
            oze_energy_production_integrated_turbines_wind_energy:
                _.toString(element.OZEEnergyProduction.integratedTurbinesWindEnergy),
            oze_energy_production_solar_energy_photothermal:
                _.toString(element.OZEEnergyProduction.solarEnergyPhotothermal),
            oze_energy_production_solar_energy_photovoltaic:
                _.toString(element.OZEEnergyProduction.solarEnergyPhotovoltaic),

            // Penb
            penb_building_envelope: _.toString(element.PENB.buildingEnvelope),
            penb_building_envelope_category: _.toString(element.PENB.buildingEnvelopeCategory),
            penb_cooling: _.toString(element.PENB.cooling),
            penb_cooling_category: _.toString(element.PENB.coolingCategory),
            penb_heating: _.toString(element.PENB.heating),
            penb_heating_category: _.toString(element.PENB.heatingCategory),
            penb_humidity_adjustment: _.toString(element.PENB.humidityAdjustment),
            penb_humidity_adjustment_category: _.toString(element.PENB.humidityAdjustmentCategory),
            penb_issue_date: _.toString(element.PENB.issueDate),
            penb_lighting: _.toString(element.PENB.lighting),
            penb_lighting_category: _.toString(element.PENB.lightingCategory),
            penb_penbnumber: _.toString(element.PENB.penbnumber),
            penb_primary_non_renewable_energy: _.toString(element.PENB.primaryNonRenewableEnergy),
            penb_primary_non_renewable_energy_category: _.toString(element.PENB.primaryNonRenewableEnergyCategory),
            penb_total_building_envelope_area: _.toString(element.PENB.totalBuildingEnvelopeArea),
            penb_total_energy_reference_area: _.toString(element.PENB.totalEnergyReferenceArea),
            penb_total_provided_energy: _.toString(element.PENB.totalProvidedEnergy),
            penb_total_provided_energy_category: _.toString(element.PENB.totalProvidedEnergyCategory),
            penb_ventilation: _.toString(element.PENB.ventilation),
            penb_ventilation_category: _.toString(element.PENB.ventilationCategory),
            penb_volume_factor_of_avshape: _.toString(element.PENB.volumeFactorOfAvshape),
            penb_warm_water: _.toString(element.PENB.warmWater),
            penb_warm_water_category: _.toString(element.PENB.warmWaterCategory),

            registration_unit: _.toString(element.RegistrationUnit),
            secondary_use: _.toString(element.SecondaryUse),
            students_count: _.toString(element.StudentsCount),

            // Technical equipment - Cooling
            technical_equipment_cooling_cooling_area_percentage:
                _.toString(element.TechnicalEquipment.cooling.coolingAreaPercentage),
            technical_equipment_cooling_cooling_system: _.toString(element.TechnicalEquipment.cooling.coolingSystem),
            technical_equipment_cooling_technical_condition:
                _.toString(element.TechnicalEquipment.cooling.technicalCondition),
            technical_equipment_cooling_year: _.toString(element.TechnicalEquipment.cooling.year),

            // Technical equipment - Heating
            technical_equipment_heating_heat_percentage: _.toString(element.TechnicalEquipment.heating.heatPercentage),
            technical_equipment_heating_heating_system: _.toString(element.TechnicalEquipment.heating.heatingSystem),
            technical_equipment_heating_main_source_of_heat:
                _.toString(element.TechnicalEquipment.heating.mainSourceOfHeat),
            technical_equipment_heating_secondary_source_of_heat:
                _.toString(element.TechnicalEquipment.heating.secondarySourceOfHeat),
            technical_equipment_heating_technical_condition:
                _.toString(element.TechnicalEquipment.heating.technicalCondition),
            technical_equipment_heating_year: _.toString(element.TechnicalEquipment.heating.year),

            // Technical equipment - Hot water
            technical_equipment_hot_water_hot_water_source:
                _.toString(element.TechnicalEquipment.hotWater.hotWaterSource),
            technical_equipment_hot_water_predominant_way_of_heating_tv:
                _.toString(element.TechnicalEquipment.hotWater.predominantWayOfHeatingTv),
            technical_equipment_hot_water_technical_condition:
                _.toString(element.TechnicalEquipment.hotWater.technicalCondition),
            technical_equipment_hot_water_year: _.toString(element.TechnicalEquipment.hotWater.year),

            // Technical equipment - Humidity
            technical_equipment_humidity_adjustment_humidity_adjustment:
                _.toString(element.TechnicalEquipment.humidityAdjustment.humidityAdjustment),
            technical_equipment_humidity_adjustment_technical_condition:
                _.toString(element.TechnicalEquipment.humidityAdjustment.technicalCondition),
            technical_equipment_humidity_adjustment_year:
                _.toString(element.TechnicalEquipment.humidityAdjustment.year),

            // Technical equipment - Lightning
            technical_equipment_lighting_lighting: _.toString(element.TechnicalEquipment.lighting.lighting),
            technical_equipment_lighting_measurement_method:
                _.toString(element.TechnicalEquipment.lighting.measurementMethod),
            technical_equipment_lighting_other_technological_elements:
                _.toString(element.TechnicalEquipment.lighting.otherTechnologicalElements),
            technical_equipment_lighting_technical_condition:
                _.toString(element.TechnicalEquipment.lighting.technicalCondition),
            technical_equipment_lighting_year: _.toString(element.TechnicalEquipment.lighting.year),

            // Technical equipment - Ventilation
            technical_equipment_ventilation_technical_condition:
                _.toString(element.TechnicalEquipment.ventilation.technicalCondition),
            technical_equipment_ventilation_ventilation: _.toString(element.TechnicalEquipment.ventilation.ventilation),
            technical_equipment_ventilation_year: _.toString(element.TechnicalEquipment.ventilation.year),

            // Waste and emissions
            waste_and_emissions_operating_co_2emissions: _.toString(element.WasteAndEmissions.operatingCo2emissions),
            waste_and_emissions_solid_waste_production: _.toString(element.WasteAndEmissions.solidWasteProduction),
            waste_and_emissions_sox_emissions: _.toString(element.WasteAndEmissions.soxEmissions),
            waste_and_emissions_tied_co2_emissions: _.toString(element.WasteAndEmissions.tiedCo2emissions),

            water_consumption_normatives: _.toString(element.WaterConsumptionNormatives),
            weekend_opening_hours: _.toString(element.WeekendOpeningHours),
            year_of_construction: _.toString(element.YearOfConstruction),
        };

        return res;
    }
}
