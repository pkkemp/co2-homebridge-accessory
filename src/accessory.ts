import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import * as http from "node:http";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("CO2Monitor", CO2Monitor);
};

class CO2Monitor implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private co2detected = false;
  private co2level = 0;
  private url: string;

  private readonly sensorService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.url = "https://weather-data.kemp.me/dc/co2/"
    this.name = config.name;

    this.sensorService = new hap.Service.CarbonDioxideSensor(this.name);
    this.sensorService.getCharacteristic(hap.Characteristic.CarbonDioxideLevel)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        http.get(this.url, (response) => {
          let body = '';

          response.on('data', (chunk) => {
            body += chunk;
          });

          response.on('end', () => {
            try {
              const data = JSON.parse(body);
              const co2Level = data.co2 || 0; // Assuming JSON payload has 'co2' key
              this.log(`CO2 level: ${co2Level}`);
              this.co2level = data.co2level;
              callback();
            } catch (error) {
              this.log('Error parsing JSON:', error);
              callback();
            }
          });
        }).on('error', (error) => {
          this.log('HTTP GET failed:', error);
          callback(error);
        });
        // log.info("Current state of the switch was returned: " + (this.switchOn? "ON": "OFF"));
        // callback(undefined, this.switchOn);
      })
      // .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      //   this.switchOn = value as boolean;
      //   log.info("Switch state was set to: " + (this.switchOn? "ON": "OFF"));
      //   callback();
      // });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    log.info("Switch finished initializing!");
  }

  // getCO2Level(callback) {
  //   http.get(this.url, (response) => {
  //     let body = '';
  //
  //     response.on('data', (chunk) => {
  //       body += chunk;
  //     });
  //
  //     response.on('end', () => {
  //       try {
  //         const data = JSON.parse(body);
  //         const co2Level = data.co2 || 0; // Assuming JSON payload has 'co2' key
  //         this.log(`CO2 level: ${co2Level}`);
  //         callback(null, co2Level);
  //       } catch (error) {
  //         this.log('Error parsing JSON:', error);
  //         callback(error);
  //       }
  //     });
  //   }).on('error', (error) => {
  //     this.log('HTTP GET failed:', error);
  //     callback(error);
  //   });
  // }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.sensorService,
    ];
  }

}
