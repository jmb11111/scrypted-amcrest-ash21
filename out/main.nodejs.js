/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@scrypted/sdk/dist/src sync recursive"
/*!***************************************************!*\
  !*** ./node_modules/@scrypted/sdk/dist/src/ sync ***!
  \***************************************************/
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "./node_modules/@scrypted/sdk/dist/src sync recursive";
module.exports = webpackEmptyContext;

/***/ },

/***/ "./node_modules/@scrypted/sdk/dist/src/index.js"
/*!******************************************************!*\
  !*** ./node_modules/@scrypted/sdk/dist/src/index.js ***!
  \******************************************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sdk = exports.MixinDeviceBase = exports.ScryptedDeviceBase = void 0;
__exportStar(__webpack_require__(/*! ../types/gen/index */ "./node_modules/@scrypted/sdk/dist/types/gen/index.js"), exports);
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const index_1 = __webpack_require__(/*! ../types/gen/index */ "./node_modules/@scrypted/sdk/dist/types/gen/index.js");
const module_1 = __webpack_require__(/*! module */ "module");
/**
 * @category Core Reference
 */
class ScryptedDeviceBase extends index_1.DeviceBase {
    constructor(nativeId) {
        super();
        this.nativeId = nativeId;
    }
    get storage() {
        if (!this._storage) {
            this._storage = exports.sdk.deviceManager.getDeviceStorage(this.nativeId);
        }
        return this._storage;
    }
    get log() {
        if (!this._log) {
            this._log = exports.sdk.deviceManager.getDeviceLogger(this.nativeId);
        }
        return this._log;
    }
    get console() {
        if (!this._console) {
            this._console = exports.sdk.deviceManager.getDeviceConsole(this.nativeId);
        }
        return this._console;
    }
    async createMediaObject(data, mimeType) {
        return exports.sdk.mediaManager.createMediaObject(data, mimeType, {
            sourceId: this.id,
        });
    }
    getMediaObjectConsole(mediaObject) {
        if (typeof mediaObject.sourceId !== 'string')
            return this.console;
        return exports.sdk.deviceManager.getMixinConsole(mediaObject.sourceId, this.nativeId);
    }
    _lazyLoadDeviceState() {
        if (!this._deviceState) {
            if (this.nativeId) {
                this._deviceState = exports.sdk.deviceManager.getDeviceState(this.nativeId);
            }
            else {
                this._deviceState = exports.sdk.deviceManager.getDeviceState();
            }
        }
    }
    /**
     * Fire an event for this device.
     */
    onDeviceEvent(eventInterface, eventData) {
        return exports.sdk.deviceManager.onDeviceEvent(this.nativeId, eventInterface, eventData);
    }
}
exports.ScryptedDeviceBase = ScryptedDeviceBase;
/**
 * @category Mixin Reference
 */
class MixinDeviceBase extends index_1.DeviceBase {
    constructor(options) {
        super();
        this._listeners = new Set();
        this.mixinDevice = options.mixinDevice;
        this.mixinDeviceInterfaces = options.mixinDeviceInterfaces;
        this.mixinStorageSuffix = options.mixinStorageSuffix;
        this._deviceState = options.mixinDeviceState;
        this.nativeId = exports.sdk.systemManager.getDeviceById(this.id).nativeId;
        this.mixinProviderNativeId = options.mixinProviderNativeId;
        // RpcProxy will trap all properties, and the following check/hack will determine
        // if the device state came from another node worker thread.
        // This should ultimately be discouraged and warned at some point in the future.
        if (this._deviceState.__rpcproxy_traps_all_properties && typeof this._deviceState.id === 'string') {
            this._deviceState = exports.sdk.deviceManager.createDeviceState(this._deviceState.id, this._deviceState.setState);
        }
    }
    get storage() {
        if (!this._storage) {
            const mixinStorageSuffix = this.mixinStorageSuffix;
            const mixinStorageKey = this.id + (mixinStorageSuffix ? ':' + mixinStorageSuffix : '');
            this._storage = exports.sdk.deviceManager.getMixinStorage(mixinStorageKey, this.mixinProviderNativeId);
        }
        return this._storage;
    }
    get console() {
        if (!this._console) {
            if (exports.sdk.deviceManager.getMixinConsole)
                this._console = exports.sdk.deviceManager.getMixinConsole(this.id, this.mixinProviderNativeId);
            else
                this._console = exports.sdk.deviceManager.getDeviceConsole(this.mixinProviderNativeId);
        }
        return this._console;
    }
    async createMediaObject(data, mimeType) {
        return exports.sdk.mediaManager.createMediaObject(data, mimeType, {
            sourceId: this.id,
        });
    }
    getMediaObjectConsole(mediaObject) {
        if (typeof mediaObject.sourceId !== 'string')
            return this.console;
        return exports.sdk.deviceManager.getMixinConsole(mediaObject.sourceId, this.mixinProviderNativeId);
    }
    /**
     * Fire an event for this device.
     */
    onDeviceEvent(eventInterface, eventData) {
        return exports.sdk.deviceManager.onMixinEvent(this.id, this, eventInterface, eventData);
    }
    _lazyLoadDeviceState() {
    }
    manageListener(listener) {
        this._listeners.add(listener);
    }
    release() {
        for (const l of this._listeners) {
            l.removeListener();
        }
    }
}
exports.MixinDeviceBase = MixinDeviceBase;
(function () {
    function _createGetState(state) {
        return function () {
            this._lazyLoadDeviceState();
            // @ts-ignore: accessing private property
            return this._deviceState?.[state];
        };
    }
    function _createSetState(state) {
        return function (value) {
            this._lazyLoadDeviceState();
            // @ts-ignore: accessing private property
            if (!this._deviceState) {
                console.warn('device state is unavailable. the device must be discovered with deviceManager.onDeviceDiscovered or deviceManager.onDevicesChanged before the state can be set.');
            }
            else {
                // @ts-ignore: accessing private property
                this._deviceState[state] = value;
            }
        };
    }
    for (const field of Object.values(index_1.ScryptedInterfaceProperty)) {
        if (field === index_1.ScryptedInterfaceProperty.nativeId)
            continue;
        Object.defineProperty(ScryptedDeviceBase.prototype, field, {
            set: _createSetState(field),
            get: _createGetState(field),
        });
        Object.defineProperty(MixinDeviceBase.prototype, field, {
            set: _createSetState(field),
            get: _createGetState(field),
        });
    }
})();
exports.sdk = {};
try {
    let loaded = false;
    try {
        // todo: remove usage of process.env.SCRYPTED_SDK_MODULE, only existed in prerelease builds.
        // import.meta is not a reliable way to detect es module support in webpack since webpack
        // evaluates that to true at runtime.
        const esModule = process.env.SCRYPTED_SDK_ES_MODULE || process.env.SCRYPTED_SDK_MODULE;
        const cjsModule = process.env.SCRYPTED_SDK_CJS_MODULE || process.env.SCRYPTED_SDK_MODULE;
        // @ts-expect-error
        if (esModule && "undefined" !== 'undefined') // removed by dead control flow
{}
        else if (cjsModule) {
            // @ts-expect-error
            if (typeof require !== 'undefined') {
                // @ts-expect-error
                const sdkModule = require(process.env.SCRYPTED_SDK_MODULE);
                Object.assign(exports.sdk, sdkModule.getScryptedStatic());
                loaded = true;
            }
            else {
                const sdkModule = __webpack_require__("./node_modules/@scrypted/sdk/dist/src sync recursive")(cjsModule);
                Object.assign(exports.sdk, sdkModule.getScryptedStatic());
                loaded = true;
            }
        }
    }
    catch (e) {
        console.warn("failed to load sdk module", e);
        throw e;
    }
    if (!loaded) {
        let runtimeAPI;
        try {
            runtimeAPI = pluginRuntimeAPI;
        }
        catch (e) {
        }
        Object.assign(exports.sdk, {
            log: deviceManager.getDeviceLogger(undefined),
            deviceManager,
            endpointManager,
            mediaManager,
            systemManager,
            pluginHostAPI,
            ...runtimeAPI,
        });
    }
    try {
        let descriptors = {
            ...index_1.ScryptedInterfaceDescriptors,
        };
        try {
            const sdkJson = JSON.parse(fs_1.default.readFileSync('../sdk.json').toString());
            const customDescriptors = sdkJson.interfaceDescriptors;
            if (customDescriptors) {
                descriptors = {
                    ...descriptors,
                    ...customDescriptors,
                };
            }
        }
        catch (e) {
            console.warn('failed to load custom interface descriptors', e);
        }
        exports.sdk.systemManager.setScryptedInterfaceDescriptors?.(index_1.TYPES_VERSION, descriptors)?.catch(() => { });
    }
    catch (e) {
    }
}
catch (e) {
    console.error('sdk initialization error, import @scrypted/types or use @scrypted/client instead', e);
}
exports["default"] = exports.sdk;
//# sourceMappingURL=index.js.map

/***/ },

/***/ "./node_modules/@scrypted/sdk/dist/types/gen/index.js"
/*!************************************************************!*\
  !*** ./node_modules/@scrypted/sdk/dist/types/gen/index.js ***!
  \************************************************************/
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScryptedMimeTypes = exports.ScryptedInterface = exports.MediaPlayerState = exports.SecuritySystemObstruction = exports.SecuritySystemMode = exports.AirQuality = exports.AirPurifierMode = exports.AirPurifierStatus = exports.ChargeState = exports.LockState = exports.PanTiltZoomMovement = exports.ThermostatMode = exports.TemperatureUnit = exports.FanMode = exports.HumidityMode = exports.ScryptedDeviceType = exports.ScryptedInterfaceDescriptors = exports.ScryptedInterfaceMethod = exports.ScryptedInterfaceProperty = exports.DeviceBase = exports.TYPES_VERSION = void 0;
exports.TYPES_VERSION = "0.5.51";
class DeviceBase {
}
exports.DeviceBase = DeviceBase;
var ScryptedInterfaceProperty;
(function (ScryptedInterfaceProperty) {
    ScryptedInterfaceProperty["id"] = "id";
    ScryptedInterfaceProperty["info"] = "info";
    ScryptedInterfaceProperty["interfaces"] = "interfaces";
    ScryptedInterfaceProperty["mixins"] = "mixins";
    ScryptedInterfaceProperty["name"] = "name";
    ScryptedInterfaceProperty["nativeId"] = "nativeId";
    ScryptedInterfaceProperty["pluginId"] = "pluginId";
    ScryptedInterfaceProperty["providedInterfaces"] = "providedInterfaces";
    ScryptedInterfaceProperty["providedName"] = "providedName";
    ScryptedInterfaceProperty["providedRoom"] = "providedRoom";
    ScryptedInterfaceProperty["providedType"] = "providedType";
    ScryptedInterfaceProperty["providerId"] = "providerId";
    ScryptedInterfaceProperty["room"] = "room";
    ScryptedInterfaceProperty["type"] = "type";
    ScryptedInterfaceProperty["scryptedRuntimeArguments"] = "scryptedRuntimeArguments";
    ScryptedInterfaceProperty["on"] = "on";
    ScryptedInterfaceProperty["brightness"] = "brightness";
    ScryptedInterfaceProperty["colorTemperature"] = "colorTemperature";
    ScryptedInterfaceProperty["rgb"] = "rgb";
    ScryptedInterfaceProperty["hsv"] = "hsv";
    ScryptedInterfaceProperty["buttons"] = "buttons";
    ScryptedInterfaceProperty["sensors"] = "sensors";
    ScryptedInterfaceProperty["running"] = "running";
    ScryptedInterfaceProperty["paused"] = "paused";
    ScryptedInterfaceProperty["docked"] = "docked";
    ScryptedInterfaceProperty["temperatureSetting"] = "temperatureSetting";
    ScryptedInterfaceProperty["temperature"] = "temperature";
    ScryptedInterfaceProperty["temperatureUnit"] = "temperatureUnit";
    ScryptedInterfaceProperty["humidity"] = "humidity";
    ScryptedInterfaceProperty["resolution"] = "resolution";
    ScryptedInterfaceProperty["audioVolumes"] = "audioVolumes";
    ScryptedInterfaceProperty["recordingActive"] = "recordingActive";
    ScryptedInterfaceProperty["ptzCapabilities"] = "ptzCapabilities";
    ScryptedInterfaceProperty["lockState"] = "lockState";
    ScryptedInterfaceProperty["entryOpen"] = "entryOpen";
    ScryptedInterfaceProperty["batteryLevel"] = "batteryLevel";
    ScryptedInterfaceProperty["chargeState"] = "chargeState";
    ScryptedInterfaceProperty["online"] = "online";
    ScryptedInterfaceProperty["fromMimeType"] = "fromMimeType";
    ScryptedInterfaceProperty["toMimeType"] = "toMimeType";
    ScryptedInterfaceProperty["converters"] = "converters";
    ScryptedInterfaceProperty["binaryState"] = "binaryState";
    ScryptedInterfaceProperty["tampered"] = "tampered";
    ScryptedInterfaceProperty["sleeping"] = "sleeping";
    ScryptedInterfaceProperty["powerDetected"] = "powerDetected";
    ScryptedInterfaceProperty["audioDetected"] = "audioDetected";
    ScryptedInterfaceProperty["motionDetected"] = "motionDetected";
    ScryptedInterfaceProperty["ambientLight"] = "ambientLight";
    ScryptedInterfaceProperty["occupied"] = "occupied";
    ScryptedInterfaceProperty["flooded"] = "flooded";
    ScryptedInterfaceProperty["ultraviolet"] = "ultraviolet";
    ScryptedInterfaceProperty["luminance"] = "luminance";
    ScryptedInterfaceProperty["position"] = "position";
    ScryptedInterfaceProperty["securitySystemState"] = "securitySystemState";
    ScryptedInterfaceProperty["pm10Density"] = "pm10Density";
    ScryptedInterfaceProperty["pm25Density"] = "pm25Density";
    ScryptedInterfaceProperty["vocDensity"] = "vocDensity";
    ScryptedInterfaceProperty["noxDensity"] = "noxDensity";
    ScryptedInterfaceProperty["co2ppm"] = "co2ppm";
    ScryptedInterfaceProperty["airQuality"] = "airQuality";
    ScryptedInterfaceProperty["airPurifierState"] = "airPurifierState";
    ScryptedInterfaceProperty["filterChangeIndication"] = "filterChangeIndication";
    ScryptedInterfaceProperty["filterLifeLevel"] = "filterLifeLevel";
    ScryptedInterfaceProperty["humiditySetting"] = "humiditySetting";
    ScryptedInterfaceProperty["fan"] = "fan";
    ScryptedInterfaceProperty["applicationInfo"] = "applicationInfo";
    ScryptedInterfaceProperty["chatCompletionCapabilities"] = "chatCompletionCapabilities";
    ScryptedInterfaceProperty["systemDevice"] = "systemDevice";
})(ScryptedInterfaceProperty || (exports.ScryptedInterfaceProperty = ScryptedInterfaceProperty = {}));
var ScryptedInterfaceMethod;
(function (ScryptedInterfaceMethod) {
    ScryptedInterfaceMethod["listen"] = "listen";
    ScryptedInterfaceMethod["probe"] = "probe";
    ScryptedInterfaceMethod["setMixins"] = "setMixins";
    ScryptedInterfaceMethod["setName"] = "setName";
    ScryptedInterfaceMethod["setRoom"] = "setRoom";
    ScryptedInterfaceMethod["setType"] = "setType";
    ScryptedInterfaceMethod["getPluginJson"] = "getPluginJson";
    ScryptedInterfaceMethod["turnOff"] = "turnOff";
    ScryptedInterfaceMethod["turnOn"] = "turnOn";
    ScryptedInterfaceMethod["setBrightness"] = "setBrightness";
    ScryptedInterfaceMethod["getTemperatureMaxK"] = "getTemperatureMaxK";
    ScryptedInterfaceMethod["getTemperatureMinK"] = "getTemperatureMinK";
    ScryptedInterfaceMethod["setColorTemperature"] = "setColorTemperature";
    ScryptedInterfaceMethod["setRgb"] = "setRgb";
    ScryptedInterfaceMethod["setHsv"] = "setHsv";
    ScryptedInterfaceMethod["pressButton"] = "pressButton";
    ScryptedInterfaceMethod["sendNotification"] = "sendNotification";
    ScryptedInterfaceMethod["start"] = "start";
    ScryptedInterfaceMethod["stop"] = "stop";
    ScryptedInterfaceMethod["pause"] = "pause";
    ScryptedInterfaceMethod["resume"] = "resume";
    ScryptedInterfaceMethod["dock"] = "dock";
    ScryptedInterfaceMethod["setTemperature"] = "setTemperature";
    ScryptedInterfaceMethod["setTemperatureUnit"] = "setTemperatureUnit";
    ScryptedInterfaceMethod["getPictureOptions"] = "getPictureOptions";
    ScryptedInterfaceMethod["takePicture"] = "takePicture";
    ScryptedInterfaceMethod["getAudioStream"] = "getAudioStream";
    ScryptedInterfaceMethod["setAudioVolumes"] = "setAudioVolumes";
    ScryptedInterfaceMethod["startDisplay"] = "startDisplay";
    ScryptedInterfaceMethod["stopDisplay"] = "stopDisplay";
    ScryptedInterfaceMethod["getVideoStream"] = "getVideoStream";
    ScryptedInterfaceMethod["getVideoStreamOptions"] = "getVideoStreamOptions";
    ScryptedInterfaceMethod["getPrivacyMasks"] = "getPrivacyMasks";
    ScryptedInterfaceMethod["setPrivacyMasks"] = "setPrivacyMasks";
    ScryptedInterfaceMethod["getVideoTextOverlays"] = "getVideoTextOverlays";
    ScryptedInterfaceMethod["setVideoTextOverlay"] = "setVideoTextOverlay";
    ScryptedInterfaceMethod["getRecordingStream"] = "getRecordingStream";
    ScryptedInterfaceMethod["getRecordingStreamCurrentTime"] = "getRecordingStreamCurrentTime";
    ScryptedInterfaceMethod["getRecordingStreamOptions"] = "getRecordingStreamOptions";
    ScryptedInterfaceMethod["getRecordingStreamThumbnail"] = "getRecordingStreamThumbnail";
    ScryptedInterfaceMethod["deleteRecordingStream"] = "deleteRecordingStream";
    ScryptedInterfaceMethod["setRecordingActive"] = "setRecordingActive";
    ScryptedInterfaceMethod["ptzCommand"] = "ptzCommand";
    ScryptedInterfaceMethod["getRecordedEvents"] = "getRecordedEvents";
    ScryptedInterfaceMethod["getVideoClip"] = "getVideoClip";
    ScryptedInterfaceMethod["getVideoClips"] = "getVideoClips";
    ScryptedInterfaceMethod["getVideoClipThumbnail"] = "getVideoClipThumbnail";
    ScryptedInterfaceMethod["removeVideoClips"] = "removeVideoClips";
    ScryptedInterfaceMethod["setVideoStreamOptions"] = "setVideoStreamOptions";
    ScryptedInterfaceMethod["startIntercom"] = "startIntercom";
    ScryptedInterfaceMethod["stopIntercom"] = "stopIntercom";
    ScryptedInterfaceMethod["lock"] = "lock";
    ScryptedInterfaceMethod["unlock"] = "unlock";
    ScryptedInterfaceMethod["addPassword"] = "addPassword";
    ScryptedInterfaceMethod["getPasswords"] = "getPasswords";
    ScryptedInterfaceMethod["removePassword"] = "removePassword";
    ScryptedInterfaceMethod["activate"] = "activate";
    ScryptedInterfaceMethod["deactivate"] = "deactivate";
    ScryptedInterfaceMethod["isReversible"] = "isReversible";
    ScryptedInterfaceMethod["closeEntry"] = "closeEntry";
    ScryptedInterfaceMethod["openEntry"] = "openEntry";
    ScryptedInterfaceMethod["getDevice"] = "getDevice";
    ScryptedInterfaceMethod["releaseDevice"] = "releaseDevice";
    ScryptedInterfaceMethod["adoptDevice"] = "adoptDevice";
    ScryptedInterfaceMethod["discoverDevices"] = "discoverDevices";
    ScryptedInterfaceMethod["createDevice"] = "createDevice";
    ScryptedInterfaceMethod["getCreateDeviceSettings"] = "getCreateDeviceSettings";
    ScryptedInterfaceMethod["reboot"] = "reboot";
    ScryptedInterfaceMethod["getRefreshFrequency"] = "getRefreshFrequency";
    ScryptedInterfaceMethod["refresh"] = "refresh";
    ScryptedInterfaceMethod["getMediaStatus"] = "getMediaStatus";
    ScryptedInterfaceMethod["load"] = "load";
    ScryptedInterfaceMethod["seek"] = "seek";
    ScryptedInterfaceMethod["skipNext"] = "skipNext";
    ScryptedInterfaceMethod["skipPrevious"] = "skipPrevious";
    ScryptedInterfaceMethod["convert"] = "convert";
    ScryptedInterfaceMethod["convertMedia"] = "convertMedia";
    ScryptedInterfaceMethod["getSettings"] = "getSettings";
    ScryptedInterfaceMethod["putSetting"] = "putSetting";
    ScryptedInterfaceMethod["armSecuritySystem"] = "armSecuritySystem";
    ScryptedInterfaceMethod["disarmSecuritySystem"] = "disarmSecuritySystem";
    ScryptedInterfaceMethod["setAirPurifierState"] = "setAirPurifierState";
    ScryptedInterfaceMethod["getReadmeMarkdown"] = "getReadmeMarkdown";
    ScryptedInterfaceMethod["getOauthUrl"] = "getOauthUrl";
    ScryptedInterfaceMethod["onOauthCallback"] = "onOauthCallback";
    ScryptedInterfaceMethod["canMixin"] = "canMixin";
    ScryptedInterfaceMethod["getMixin"] = "getMixin";
    ScryptedInterfaceMethod["releaseMixin"] = "releaseMixin";
    ScryptedInterfaceMethod["onRequest"] = "onRequest";
    ScryptedInterfaceMethod["onConnection"] = "onConnection";
    ScryptedInterfaceMethod["onPush"] = "onPush";
    ScryptedInterfaceMethod["run"] = "run";
    ScryptedInterfaceMethod["eval"] = "eval";
    ScryptedInterfaceMethod["loadScripts"] = "loadScripts";
    ScryptedInterfaceMethod["saveScript"] = "saveScript";
    ScryptedInterfaceMethod["forkInterface"] = "forkInterface";
    ScryptedInterfaceMethod["getDetectionInput"] = "getDetectionInput";
    ScryptedInterfaceMethod["getObjectTypes"] = "getObjectTypes";
    ScryptedInterfaceMethod["detectObjects"] = "detectObjects";
    ScryptedInterfaceMethod["generateObjectDetections"] = "generateObjectDetections";
    ScryptedInterfaceMethod["getDetectionModel"] = "getDetectionModel";
    ScryptedInterfaceMethod["setHumidity"] = "setHumidity";
    ScryptedInterfaceMethod["setFan"] = "setFan";
    ScryptedInterfaceMethod["startRTCSignalingSession"] = "startRTCSignalingSession";
    ScryptedInterfaceMethod["createRTCSignalingSession"] = "createRTCSignalingSession";
    ScryptedInterfaceMethod["getScryptedUserAccessControl"] = "getScryptedUserAccessControl";
    ScryptedInterfaceMethod["generateVideoFrames"] = "generateVideoFrames";
    ScryptedInterfaceMethod["connectStream"] = "connectStream";
    ScryptedInterfaceMethod["getTTYSettings"] = "getTTYSettings";
    ScryptedInterfaceMethod["getChatCompletion"] = "getChatCompletion";
    ScryptedInterfaceMethod["streamChatCompletion"] = "streamChatCompletion";
    ScryptedInterfaceMethod["getTextEmbedding"] = "getTextEmbedding";
    ScryptedInterfaceMethod["getImageEmbedding"] = "getImageEmbedding";
    ScryptedInterfaceMethod["callLLMTool"] = "callLLMTool";
    ScryptedInterfaceMethod["getLLMTools"] = "getLLMTools";
})(ScryptedInterfaceMethod || (exports.ScryptedInterfaceMethod = ScryptedInterfaceMethod = {}));
exports.ScryptedInterfaceDescriptors = {
    "ScryptedDevice": {
        "name": "ScryptedDevice",
        "methods": [
            "listen",
            "probe",
            "setMixins",
            "setName",
            "setRoom",
            "setType"
        ],
        "properties": [
            "id",
            "info",
            "interfaces",
            "mixins",
            "name",
            "nativeId",
            "pluginId",
            "providedInterfaces",
            "providedName",
            "providedRoom",
            "providedType",
            "providerId",
            "room",
            "type"
        ]
    },
    "ScryptedPlugin": {
        "name": "ScryptedPlugin",
        "methods": [
            "getPluginJson"
        ],
        "properties": []
    },
    "ScryptedPluginRuntime": {
        "name": "ScryptedPluginRuntime",
        "methods": [],
        "properties": [
            "scryptedRuntimeArguments"
        ]
    },
    "OnOff": {
        "name": "OnOff",
        "methods": [
            "turnOff",
            "turnOn"
        ],
        "properties": [
            "on"
        ]
    },
    "Brightness": {
        "name": "Brightness",
        "methods": [
            "setBrightness"
        ],
        "properties": [
            "brightness"
        ]
    },
    "ColorSettingTemperature": {
        "name": "ColorSettingTemperature",
        "methods": [
            "getTemperatureMaxK",
            "getTemperatureMinK",
            "setColorTemperature"
        ],
        "properties": [
            "colorTemperature"
        ]
    },
    "ColorSettingRgb": {
        "name": "ColorSettingRgb",
        "methods": [
            "setRgb"
        ],
        "properties": [
            "rgb"
        ]
    },
    "ColorSettingHsv": {
        "name": "ColorSettingHsv",
        "methods": [
            "setHsv"
        ],
        "properties": [
            "hsv"
        ]
    },
    "Buttons": {
        "name": "Buttons",
        "methods": [],
        "properties": [
            "buttons"
        ]
    },
    "PressButtons": {
        "name": "PressButtons",
        "methods": [
            "pressButton"
        ],
        "properties": []
    },
    "Sensors": {
        "name": "Sensors",
        "methods": [],
        "properties": [
            "sensors"
        ]
    },
    "Notifier": {
        "name": "Notifier",
        "methods": [
            "sendNotification"
        ],
        "properties": []
    },
    "StartStop": {
        "name": "StartStop",
        "methods": [
            "start",
            "stop"
        ],
        "properties": [
            "running"
        ]
    },
    "Pause": {
        "name": "Pause",
        "methods": [
            "pause",
            "resume"
        ],
        "properties": [
            "paused"
        ]
    },
    "Dock": {
        "name": "Dock",
        "methods": [
            "dock"
        ],
        "properties": [
            "docked"
        ]
    },
    "TemperatureSetting": {
        "name": "TemperatureSetting",
        "methods": [
            "setTemperature"
        ],
        "properties": [
            "temperatureSetting"
        ]
    },
    "Thermometer": {
        "name": "Thermometer",
        "methods": [
            "setTemperatureUnit"
        ],
        "properties": [
            "temperature",
            "temperatureUnit"
        ]
    },
    "HumiditySensor": {
        "name": "HumiditySensor",
        "methods": [],
        "properties": [
            "humidity"
        ]
    },
    "Camera": {
        "name": "Camera",
        "methods": [
            "getPictureOptions",
            "takePicture"
        ],
        "properties": []
    },
    "Resolution": {
        "name": "Resolution",
        "methods": [],
        "properties": [
            "resolution"
        ]
    },
    "Microphone": {
        "name": "Microphone",
        "methods": [
            "getAudioStream"
        ],
        "properties": []
    },
    "AudioVolumeControl": {
        "name": "AudioVolumeControl",
        "methods": [
            "setAudioVolumes"
        ],
        "properties": [
            "audioVolumes"
        ]
    },
    "Display": {
        "name": "Display",
        "methods": [
            "startDisplay",
            "stopDisplay"
        ],
        "properties": []
    },
    "VideoCamera": {
        "name": "VideoCamera",
        "methods": [
            "getVideoStream",
            "getVideoStreamOptions"
        ],
        "properties": []
    },
    "VideoCameraMask": {
        "name": "VideoCameraMask",
        "methods": [
            "getPrivacyMasks",
            "setPrivacyMasks"
        ],
        "properties": []
    },
    "VideoTextOverlays": {
        "name": "VideoTextOverlays",
        "methods": [
            "getVideoTextOverlays",
            "setVideoTextOverlay"
        ],
        "properties": []
    },
    "VideoRecorder": {
        "name": "VideoRecorder",
        "methods": [
            "getRecordingStream",
            "getRecordingStreamCurrentTime",
            "getRecordingStreamOptions",
            "getRecordingStreamThumbnail"
        ],
        "properties": [
            "recordingActive"
        ]
    },
    "VideoRecorderManagement": {
        "name": "VideoRecorderManagement",
        "methods": [
            "deleteRecordingStream",
            "setRecordingActive"
        ],
        "properties": []
    },
    "PanTiltZoom": {
        "name": "PanTiltZoom",
        "methods": [
            "ptzCommand"
        ],
        "properties": [
            "ptzCapabilities"
        ]
    },
    "EventRecorder": {
        "name": "EventRecorder",
        "methods": [
            "getRecordedEvents"
        ],
        "properties": []
    },
    "VideoClips": {
        "name": "VideoClips",
        "methods": [
            "getVideoClip",
            "getVideoClips",
            "getVideoClipThumbnail",
            "removeVideoClips"
        ],
        "properties": []
    },
    "VideoCameraConfiguration": {
        "name": "VideoCameraConfiguration",
        "methods": [
            "setVideoStreamOptions"
        ],
        "properties": []
    },
    "Intercom": {
        "name": "Intercom",
        "methods": [
            "startIntercom",
            "stopIntercom"
        ],
        "properties": []
    },
    "Lock": {
        "name": "Lock",
        "methods": [
            "lock",
            "unlock"
        ],
        "properties": [
            "lockState"
        ]
    },
    "PasswordStore": {
        "name": "PasswordStore",
        "methods": [
            "addPassword",
            "getPasswords",
            "removePassword"
        ],
        "properties": []
    },
    "Scene": {
        "name": "Scene",
        "methods": [
            "activate",
            "deactivate",
            "isReversible"
        ],
        "properties": []
    },
    "Entry": {
        "name": "Entry",
        "methods": [
            "closeEntry",
            "openEntry"
        ],
        "properties": []
    },
    "EntrySensor": {
        "name": "EntrySensor",
        "methods": [],
        "properties": [
            "entryOpen"
        ]
    },
    "DeviceProvider": {
        "name": "DeviceProvider",
        "methods": [
            "getDevice",
            "releaseDevice"
        ],
        "properties": []
    },
    "DeviceDiscovery": {
        "name": "DeviceDiscovery",
        "methods": [
            "adoptDevice",
            "discoverDevices"
        ],
        "properties": []
    },
    "DeviceCreator": {
        "name": "DeviceCreator",
        "methods": [
            "createDevice",
            "getCreateDeviceSettings"
        ],
        "properties": []
    },
    "Battery": {
        "name": "Battery",
        "methods": [],
        "properties": [
            "batteryLevel"
        ]
    },
    "Charger": {
        "name": "Charger",
        "methods": [],
        "properties": [
            "chargeState"
        ]
    },
    "Reboot": {
        "name": "Reboot",
        "methods": [
            "reboot"
        ],
        "properties": []
    },
    "Refresh": {
        "name": "Refresh",
        "methods": [
            "getRefreshFrequency",
            "refresh"
        ],
        "properties": []
    },
    "MediaPlayer": {
        "name": "MediaPlayer",
        "methods": [
            "getMediaStatus",
            "load",
            "seek",
            "skipNext",
            "skipPrevious"
        ],
        "properties": []
    },
    "Online": {
        "name": "Online",
        "methods": [],
        "properties": [
            "online"
        ]
    },
    "BufferConverter": {
        "name": "BufferConverter",
        "methods": [
            "convert"
        ],
        "properties": [
            "fromMimeType",
            "toMimeType"
        ]
    },
    "MediaConverter": {
        "name": "MediaConverter",
        "methods": [
            "convertMedia"
        ],
        "properties": [
            "converters"
        ]
    },
    "Settings": {
        "name": "Settings",
        "methods": [
            "getSettings",
            "putSetting"
        ],
        "properties": []
    },
    "BinarySensor": {
        "name": "BinarySensor",
        "methods": [],
        "properties": [
            "binaryState"
        ]
    },
    "TamperSensor": {
        "name": "TamperSensor",
        "methods": [],
        "properties": [
            "tampered"
        ]
    },
    "Sleep": {
        "name": "Sleep",
        "methods": [],
        "properties": [
            "sleeping"
        ]
    },
    "PowerSensor": {
        "name": "PowerSensor",
        "methods": [],
        "properties": [
            "powerDetected"
        ]
    },
    "AudioSensor": {
        "name": "AudioSensor",
        "methods": [],
        "properties": [
            "audioDetected"
        ]
    },
    "MotionSensor": {
        "name": "MotionSensor",
        "methods": [],
        "properties": [
            "motionDetected"
        ]
    },
    "AmbientLightSensor": {
        "name": "AmbientLightSensor",
        "methods": [],
        "properties": [
            "ambientLight"
        ]
    },
    "OccupancySensor": {
        "name": "OccupancySensor",
        "methods": [],
        "properties": [
            "occupied"
        ]
    },
    "FloodSensor": {
        "name": "FloodSensor",
        "methods": [],
        "properties": [
            "flooded"
        ]
    },
    "UltravioletSensor": {
        "name": "UltravioletSensor",
        "methods": [],
        "properties": [
            "ultraviolet"
        ]
    },
    "LuminanceSensor": {
        "name": "LuminanceSensor",
        "methods": [],
        "properties": [
            "luminance"
        ]
    },
    "PositionSensor": {
        "name": "PositionSensor",
        "methods": [],
        "properties": [
            "position"
        ]
    },
    "SecuritySystem": {
        "name": "SecuritySystem",
        "methods": [
            "armSecuritySystem",
            "disarmSecuritySystem"
        ],
        "properties": [
            "securitySystemState"
        ]
    },
    "PM10Sensor": {
        "name": "PM10Sensor",
        "methods": [],
        "properties": [
            "pm10Density"
        ]
    },
    "PM25Sensor": {
        "name": "PM25Sensor",
        "methods": [],
        "properties": [
            "pm25Density"
        ]
    },
    "VOCSensor": {
        "name": "VOCSensor",
        "methods": [],
        "properties": [
            "vocDensity"
        ]
    },
    "NOXSensor": {
        "name": "NOXSensor",
        "methods": [],
        "properties": [
            "noxDensity"
        ]
    },
    "CO2Sensor": {
        "name": "CO2Sensor",
        "methods": [],
        "properties": [
            "co2ppm"
        ]
    },
    "AirQualitySensor": {
        "name": "AirQualitySensor",
        "methods": [],
        "properties": [
            "airQuality"
        ]
    },
    "AirPurifier": {
        "name": "AirPurifier",
        "methods": [
            "setAirPurifierState"
        ],
        "properties": [
            "airPurifierState"
        ]
    },
    "FilterMaintenance": {
        "name": "FilterMaintenance",
        "methods": [],
        "properties": [
            "filterChangeIndication",
            "filterLifeLevel"
        ]
    },
    "Readme": {
        "name": "Readme",
        "methods": [
            "getReadmeMarkdown"
        ],
        "properties": []
    },
    "OauthClient": {
        "name": "OauthClient",
        "methods": [
            "getOauthUrl",
            "onOauthCallback"
        ],
        "properties": []
    },
    "MixinProvider": {
        "name": "MixinProvider",
        "methods": [
            "canMixin",
            "getMixin",
            "releaseMixin"
        ],
        "properties": []
    },
    "HttpRequestHandler": {
        "name": "HttpRequestHandler",
        "methods": [
            "onRequest"
        ],
        "properties": []
    },
    "EngineIOHandler": {
        "name": "EngineIOHandler",
        "methods": [
            "onConnection"
        ],
        "properties": []
    },
    "PushHandler": {
        "name": "PushHandler",
        "methods": [
            "onPush"
        ],
        "properties": []
    },
    "Program": {
        "name": "Program",
        "methods": [
            "run"
        ],
        "properties": []
    },
    "Scriptable": {
        "name": "Scriptable",
        "methods": [
            "eval",
            "loadScripts",
            "saveScript"
        ],
        "properties": []
    },
    "ClusterForkInterface": {
        "name": "ClusterForkInterface",
        "methods": [
            "forkInterface"
        ],
        "properties": []
    },
    "ObjectDetector": {
        "name": "ObjectDetector",
        "methods": [
            "getDetectionInput",
            "getObjectTypes"
        ],
        "properties": []
    },
    "ObjectDetection": {
        "name": "ObjectDetection",
        "methods": [
            "detectObjects",
            "generateObjectDetections",
            "getDetectionModel"
        ],
        "properties": []
    },
    "ObjectDetectionPreview": {
        "name": "ObjectDetectionPreview",
        "methods": [],
        "properties": []
    },
    "ObjectDetectionGenerator": {
        "name": "ObjectDetectionGenerator",
        "methods": [],
        "properties": []
    },
    "HumiditySetting": {
        "name": "HumiditySetting",
        "methods": [
            "setHumidity"
        ],
        "properties": [
            "humiditySetting"
        ]
    },
    "Fan": {
        "name": "Fan",
        "methods": [
            "setFan"
        ],
        "properties": [
            "fan"
        ]
    },
    "RTCSignalingChannel": {
        "name": "RTCSignalingChannel",
        "methods": [
            "startRTCSignalingSession"
        ],
        "properties": []
    },
    "RTCSignalingClient": {
        "name": "RTCSignalingClient",
        "methods": [
            "createRTCSignalingSession"
        ],
        "properties": []
    },
    "LauncherApplication": {
        "name": "LauncherApplication",
        "methods": [],
        "properties": [
            "applicationInfo"
        ]
    },
    "ScryptedUser": {
        "name": "ScryptedUser",
        "methods": [
            "getScryptedUserAccessControl"
        ],
        "properties": []
    },
    "VideoFrameGenerator": {
        "name": "VideoFrameGenerator",
        "methods": [
            "generateVideoFrames"
        ],
        "properties": []
    },
    "StreamService": {
        "name": "StreamService",
        "methods": [
            "connectStream"
        ],
        "properties": []
    },
    "TTY": {
        "name": "TTY",
        "methods": [],
        "properties": []
    },
    "TTYSettings": {
        "name": "TTYSettings",
        "methods": [
            "getTTYSettings"
        ],
        "properties": []
    },
    "ChatCompletion": {
        "name": "ChatCompletion",
        "methods": [
            "getChatCompletion",
            "streamChatCompletion"
        ],
        "properties": [
            "chatCompletionCapabilities"
        ]
    },
    "TextEmbedding": {
        "name": "TextEmbedding",
        "methods": [
            "getTextEmbedding"
        ],
        "properties": []
    },
    "ImageEmbedding": {
        "name": "ImageEmbedding",
        "methods": [
            "getImageEmbedding"
        ],
        "properties": []
    },
    "LLMTools": {
        "name": "LLMTools",
        "methods": [
            "callLLMTool",
            "getLLMTools"
        ],
        "properties": []
    },
    "ScryptedSystemDevice": {
        "name": "ScryptedSystemDevice",
        "methods": [],
        "properties": [
            "systemDevice"
        ]
    },
    "ScryptedDeviceCreator": {
        "name": "ScryptedDeviceCreator",
        "methods": [],
        "properties": []
    },
    "ScryptedSettings": {
        "name": "ScryptedSettings",
        "methods": [],
        "properties": []
    }
};
/**
 * @category Core Reference
 */
var ScryptedDeviceType;
(function (ScryptedDeviceType) {
    /**
     * @deprecated
     */
    ScryptedDeviceType["Builtin"] = "Builtin";
    /**
     * Internal devices will not show up in device lists unless explicitly searched.
     */
    ScryptedDeviceType["Internal"] = "Internal";
    ScryptedDeviceType["Camera"] = "Camera";
    ScryptedDeviceType["Fan"] = "Fan";
    ScryptedDeviceType["Light"] = "Light";
    ScryptedDeviceType["Switch"] = "Switch";
    ScryptedDeviceType["Outlet"] = "Outlet";
    ScryptedDeviceType["Sensor"] = "Sensor";
    ScryptedDeviceType["Scene"] = "Scene";
    ScryptedDeviceType["Program"] = "Program";
    ScryptedDeviceType["Automation"] = "Automation";
    ScryptedDeviceType["Vacuum"] = "Vacuum";
    ScryptedDeviceType["Notifier"] = "Notifier";
    ScryptedDeviceType["Thermostat"] = "Thermostat";
    ScryptedDeviceType["Lock"] = "Lock";
    ScryptedDeviceType["PasswordControl"] = "PasswordControl";
    /**
     * Displays have audio and video output.
     */
    ScryptedDeviceType["Display"] = "Display";
    /**
     * Smart Displays have two way audio and video.
     */
    ScryptedDeviceType["SmartDisplay"] = "SmartDisplay";
    ScryptedDeviceType["Speaker"] = "Speaker";
    /**
     * Smart Speakers have two way audio.
     */
    ScryptedDeviceType["SmartSpeaker"] = "SmartSpeaker";
    ScryptedDeviceType["RemoteDesktop"] = "RemoteDesktop";
    ScryptedDeviceType["Event"] = "Event";
    ScryptedDeviceType["Entry"] = "Entry";
    ScryptedDeviceType["Garage"] = "Garage";
    ScryptedDeviceType["DeviceProvider"] = "DeviceProvider";
    ScryptedDeviceType["DataSource"] = "DataSource";
    ScryptedDeviceType["API"] = "API";
    ScryptedDeviceType["Buttons"] = "Buttons";
    ScryptedDeviceType["Doorbell"] = "Doorbell";
    ScryptedDeviceType["Irrigation"] = "Irrigation";
    ScryptedDeviceType["Valve"] = "Valve";
    ScryptedDeviceType["Person"] = "Person";
    ScryptedDeviceType["SecuritySystem"] = "SecuritySystem";
    ScryptedDeviceType["WindowCovering"] = "WindowCovering";
    ScryptedDeviceType["Siren"] = "Siren";
    ScryptedDeviceType["AirPurifier"] = "AirPurifier";
    ScryptedDeviceType["Internet"] = "Internet";
    ScryptedDeviceType["Network"] = "Network";
    ScryptedDeviceType["Bridge"] = "Bridge";
    ScryptedDeviceType["LLM"] = "LLM";
    ScryptedDeviceType["Unknown"] = "Unknown";
})(ScryptedDeviceType || (exports.ScryptedDeviceType = ScryptedDeviceType = {}));
var HumidityMode;
(function (HumidityMode) {
    HumidityMode["Humidify"] = "Humidify";
    HumidityMode["Dehumidify"] = "Dehumidify";
    HumidityMode["Auto"] = "Auto";
    HumidityMode["Off"] = "Off";
})(HumidityMode || (exports.HumidityMode = HumidityMode = {}));
var FanMode;
(function (FanMode) {
    FanMode["Auto"] = "Auto";
    FanMode["Manual"] = "Manual";
})(FanMode || (exports.FanMode = FanMode = {}));
var TemperatureUnit;
(function (TemperatureUnit) {
    TemperatureUnit["C"] = "C";
    TemperatureUnit["F"] = "F";
})(TemperatureUnit || (exports.TemperatureUnit = TemperatureUnit = {}));
var ThermostatMode;
(function (ThermostatMode) {
    ThermostatMode["Off"] = "Off";
    ThermostatMode["Cool"] = "Cool";
    ThermostatMode["Heat"] = "Heat";
    ThermostatMode["HeatCool"] = "HeatCool";
    ThermostatMode["Auto"] = "Auto";
    ThermostatMode["FanOnly"] = "FanOnly";
    ThermostatMode["Purifier"] = "Purifier";
    ThermostatMode["Eco"] = "Eco";
    ThermostatMode["Dry"] = "Dry";
    ThermostatMode["On"] = "On";
})(ThermostatMode || (exports.ThermostatMode = ThermostatMode = {}));
var PanTiltZoomMovement;
(function (PanTiltZoomMovement) {
    PanTiltZoomMovement["Absolute"] = "Absolute";
    PanTiltZoomMovement["Relative"] = "Relative";
    PanTiltZoomMovement["Continuous"] = "Continuous";
    PanTiltZoomMovement["Preset"] = "Preset";
    PanTiltZoomMovement["Home"] = "Home";
})(PanTiltZoomMovement || (exports.PanTiltZoomMovement = PanTiltZoomMovement = {}));
var LockState;
(function (LockState) {
    LockState["Locked"] = "Locked";
    LockState["Unlocked"] = "Unlocked";
    LockState["Jammed"] = "Jammed";
})(LockState || (exports.LockState = LockState = {}));
var ChargeState;
(function (ChargeState) {
    ChargeState["Trickle"] = "trickle";
    ChargeState["Charging"] = "charging";
    ChargeState["NotCharging"] = "not-charging";
})(ChargeState || (exports.ChargeState = ChargeState = {}));
var AirPurifierStatus;
(function (AirPurifierStatus) {
    AirPurifierStatus["Inactive"] = "Inactive";
    AirPurifierStatus["Idle"] = "Idle";
    AirPurifierStatus["Active"] = "Active";
    AirPurifierStatus["ActiveNightMode"] = "ActiveNightMode";
})(AirPurifierStatus || (exports.AirPurifierStatus = AirPurifierStatus = {}));
var AirPurifierMode;
(function (AirPurifierMode) {
    AirPurifierMode["Manual"] = "Manual";
    AirPurifierMode["Automatic"] = "Automatic";
})(AirPurifierMode || (exports.AirPurifierMode = AirPurifierMode = {}));
var AirQuality;
(function (AirQuality) {
    AirQuality["Unknown"] = "Unknown";
    AirQuality["Excellent"] = "Excellent";
    AirQuality["Good"] = "Good";
    AirQuality["Fair"] = "Fair";
    AirQuality["Inferior"] = "Inferior";
    AirQuality["Poor"] = "Poor";
})(AirQuality || (exports.AirQuality = AirQuality = {}));
var SecuritySystemMode;
(function (SecuritySystemMode) {
    SecuritySystemMode["Disarmed"] = "Disarmed";
    SecuritySystemMode["HomeArmed"] = "HomeArmed";
    SecuritySystemMode["AwayArmed"] = "AwayArmed";
    SecuritySystemMode["NightArmed"] = "NightArmed";
})(SecuritySystemMode || (exports.SecuritySystemMode = SecuritySystemMode = {}));
var SecuritySystemObstruction;
(function (SecuritySystemObstruction) {
    SecuritySystemObstruction["Sensor"] = "Sensor";
    SecuritySystemObstruction["Occupied"] = "Occupied";
    SecuritySystemObstruction["Time"] = "Time";
    SecuritySystemObstruction["Error"] = "Error";
})(SecuritySystemObstruction || (exports.SecuritySystemObstruction = SecuritySystemObstruction = {}));
var MediaPlayerState;
(function (MediaPlayerState) {
    MediaPlayerState["Idle"] = "Idle";
    MediaPlayerState["Playing"] = "Playing";
    MediaPlayerState["Paused"] = "Paused";
    MediaPlayerState["Buffering"] = "Buffering";
})(MediaPlayerState || (exports.MediaPlayerState = MediaPlayerState = {}));
var ScryptedInterface;
(function (ScryptedInterface) {
    ScryptedInterface["ScryptedDevice"] = "ScryptedDevice";
    ScryptedInterface["ScryptedPlugin"] = "ScryptedPlugin";
    ScryptedInterface["ScryptedPluginRuntime"] = "ScryptedPluginRuntime";
    ScryptedInterface["OnOff"] = "OnOff";
    ScryptedInterface["Brightness"] = "Brightness";
    ScryptedInterface["ColorSettingTemperature"] = "ColorSettingTemperature";
    ScryptedInterface["ColorSettingRgb"] = "ColorSettingRgb";
    ScryptedInterface["ColorSettingHsv"] = "ColorSettingHsv";
    ScryptedInterface["Buttons"] = "Buttons";
    ScryptedInterface["PressButtons"] = "PressButtons";
    ScryptedInterface["Sensors"] = "Sensors";
    ScryptedInterface["Notifier"] = "Notifier";
    ScryptedInterface["StartStop"] = "StartStop";
    ScryptedInterface["Pause"] = "Pause";
    ScryptedInterface["Dock"] = "Dock";
    ScryptedInterface["TemperatureSetting"] = "TemperatureSetting";
    ScryptedInterface["Thermometer"] = "Thermometer";
    ScryptedInterface["HumiditySensor"] = "HumiditySensor";
    ScryptedInterface["Camera"] = "Camera";
    ScryptedInterface["Resolution"] = "Resolution";
    ScryptedInterface["Microphone"] = "Microphone";
    ScryptedInterface["AudioVolumeControl"] = "AudioVolumeControl";
    ScryptedInterface["Display"] = "Display";
    ScryptedInterface["VideoCamera"] = "VideoCamera";
    ScryptedInterface["VideoCameraMask"] = "VideoCameraMask";
    ScryptedInterface["VideoTextOverlays"] = "VideoTextOverlays";
    ScryptedInterface["VideoRecorder"] = "VideoRecorder";
    ScryptedInterface["VideoRecorderManagement"] = "VideoRecorderManagement";
    ScryptedInterface["PanTiltZoom"] = "PanTiltZoom";
    ScryptedInterface["EventRecorder"] = "EventRecorder";
    ScryptedInterface["VideoClips"] = "VideoClips";
    ScryptedInterface["VideoCameraConfiguration"] = "VideoCameraConfiguration";
    ScryptedInterface["Intercom"] = "Intercom";
    ScryptedInterface["Lock"] = "Lock";
    ScryptedInterface["PasswordStore"] = "PasswordStore";
    ScryptedInterface["Scene"] = "Scene";
    ScryptedInterface["Entry"] = "Entry";
    ScryptedInterface["EntrySensor"] = "EntrySensor";
    ScryptedInterface["DeviceProvider"] = "DeviceProvider";
    ScryptedInterface["DeviceDiscovery"] = "DeviceDiscovery";
    ScryptedInterface["DeviceCreator"] = "DeviceCreator";
    ScryptedInterface["Battery"] = "Battery";
    ScryptedInterface["Charger"] = "Charger";
    ScryptedInterface["Reboot"] = "Reboot";
    ScryptedInterface["Refresh"] = "Refresh";
    ScryptedInterface["MediaPlayer"] = "MediaPlayer";
    ScryptedInterface["Online"] = "Online";
    ScryptedInterface["BufferConverter"] = "BufferConverter";
    ScryptedInterface["MediaConverter"] = "MediaConverter";
    ScryptedInterface["Settings"] = "Settings";
    ScryptedInterface["BinarySensor"] = "BinarySensor";
    ScryptedInterface["TamperSensor"] = "TamperSensor";
    ScryptedInterface["Sleep"] = "Sleep";
    ScryptedInterface["PowerSensor"] = "PowerSensor";
    ScryptedInterface["AudioSensor"] = "AudioSensor";
    ScryptedInterface["MotionSensor"] = "MotionSensor";
    ScryptedInterface["AmbientLightSensor"] = "AmbientLightSensor";
    ScryptedInterface["OccupancySensor"] = "OccupancySensor";
    ScryptedInterface["FloodSensor"] = "FloodSensor";
    ScryptedInterface["UltravioletSensor"] = "UltravioletSensor";
    ScryptedInterface["LuminanceSensor"] = "LuminanceSensor";
    ScryptedInterface["PositionSensor"] = "PositionSensor";
    ScryptedInterface["SecuritySystem"] = "SecuritySystem";
    ScryptedInterface["PM10Sensor"] = "PM10Sensor";
    ScryptedInterface["PM25Sensor"] = "PM25Sensor";
    ScryptedInterface["VOCSensor"] = "VOCSensor";
    ScryptedInterface["NOXSensor"] = "NOXSensor";
    ScryptedInterface["CO2Sensor"] = "CO2Sensor";
    ScryptedInterface["AirQualitySensor"] = "AirQualitySensor";
    ScryptedInterface["AirPurifier"] = "AirPurifier";
    ScryptedInterface["FilterMaintenance"] = "FilterMaintenance";
    ScryptedInterface["Readme"] = "Readme";
    ScryptedInterface["OauthClient"] = "OauthClient";
    ScryptedInterface["MixinProvider"] = "MixinProvider";
    ScryptedInterface["HttpRequestHandler"] = "HttpRequestHandler";
    ScryptedInterface["EngineIOHandler"] = "EngineIOHandler";
    ScryptedInterface["PushHandler"] = "PushHandler";
    ScryptedInterface["Program"] = "Program";
    ScryptedInterface["Scriptable"] = "Scriptable";
    ScryptedInterface["ClusterForkInterface"] = "ClusterForkInterface";
    ScryptedInterface["ObjectDetector"] = "ObjectDetector";
    ScryptedInterface["ObjectDetection"] = "ObjectDetection";
    ScryptedInterface["ObjectDetectionPreview"] = "ObjectDetectionPreview";
    ScryptedInterface["ObjectDetectionGenerator"] = "ObjectDetectionGenerator";
    ScryptedInterface["HumiditySetting"] = "HumiditySetting";
    ScryptedInterface["Fan"] = "Fan";
    ScryptedInterface["RTCSignalingChannel"] = "RTCSignalingChannel";
    ScryptedInterface["RTCSignalingClient"] = "RTCSignalingClient";
    ScryptedInterface["LauncherApplication"] = "LauncherApplication";
    ScryptedInterface["ScryptedUser"] = "ScryptedUser";
    ScryptedInterface["VideoFrameGenerator"] = "VideoFrameGenerator";
    ScryptedInterface["StreamService"] = "StreamService";
    ScryptedInterface["TTY"] = "TTY";
    ScryptedInterface["TTYSettings"] = "TTYSettings";
    ScryptedInterface["ChatCompletion"] = "ChatCompletion";
    ScryptedInterface["TextEmbedding"] = "TextEmbedding";
    ScryptedInterface["ImageEmbedding"] = "ImageEmbedding";
    ScryptedInterface["LLMTools"] = "LLMTools";
    ScryptedInterface["ScryptedSystemDevice"] = "ScryptedSystemDevice";
    ScryptedInterface["ScryptedDeviceCreator"] = "ScryptedDeviceCreator";
    ScryptedInterface["ScryptedSettings"] = "ScryptedSettings";
})(ScryptedInterface || (exports.ScryptedInterface = ScryptedInterface = {}));
var ScryptedMimeTypes;
(function (ScryptedMimeTypes) {
    ScryptedMimeTypes["Url"] = "text/x-uri";
    ScryptedMimeTypes["InsecureLocalUrl"] = "text/x-insecure-local-uri";
    ScryptedMimeTypes["LocalUrl"] = "text/x-local-uri";
    ScryptedMimeTypes["ServerId"] = "text/x-server-id";
    ScryptedMimeTypes["PushEndpoint"] = "text/x-push-endpoint";
    ScryptedMimeTypes["SchemePrefix"] = "x-scrypted/x-scrypted-scheme-";
    ScryptedMimeTypes["MediaStreamUrl"] = "text/x-media-url";
    ScryptedMimeTypes["MediaObject"] = "x-scrypted/x-scrypted-media-object";
    ScryptedMimeTypes["RequestMediaObject"] = "x-scrypted/x-scrypted-request-media-object";
    ScryptedMimeTypes["RequestMediaStream"] = "x-scrypted/x-scrypted-request-stream";
    ScryptedMimeTypes["MediaStreamFeedback"] = "x-scrypted/x-media-stream-feedback";
    ScryptedMimeTypes["FFmpegInput"] = "x-scrypted/x-ffmpeg-input";
    ScryptedMimeTypes["FFmpegTranscodeStream"] = "x-scrypted/x-ffmpeg-transcode-stream";
    ScryptedMimeTypes["RTCSignalingChannel"] = "x-scrypted/x-scrypted-rtc-signaling-channel";
    ScryptedMimeTypes["RTCSignalingSession"] = "x-scrypted/x-scrypted-rtc-signaling-session";
    ScryptedMimeTypes["RTCConnectionManagement"] = "x-scrypted/x-scrypted-rtc-connection-management";
    ScryptedMimeTypes["Image"] = "x-scrypted/x-scrypted-image";
})(ScryptedMimeTypes || (exports.ScryptedMimeTypes = ScryptedMimeTypes = {}));
//# sourceMappingURL=index.js.map

/***/ },

/***/ "./src/dvrip.ts"
/*!**********************!*\
  !*** ./src/dvrip.ts ***!
  \**********************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DahuaDVRIP = void 0;
const net = __importStar(__webpack_require__(/*! net */ "net"));
const crypto = __importStar(__webpack_require__(/*! crypto */ "crypto"));
// Valid DVRIP packet prefixes
const DVRIP_HEADERS = [
    Buffer.from([0xa0, 0x00]), // 3DES Login
    Buffer.from([0xa0, 0x01]), // DVRIP Send Request Realm
    Buffer.from([0xa0, 0x05]), // DVRIP login Send Login Details
    Buffer.from([0xb0, 0x00]), // DVRIP Receive
    Buffer.from([0xb0, 0x01]), // DVRIP Receive
    Buffer.from([0xa3, 0x01]), // DVRIP Discover Request
    Buffer.from([0xb3, 0x00]), // DVRIP Discover Response
    Buffer.from([0xf6, 0x00]), // DVRIP JSON
];
function isDvripPacket(data) {
    if (data.length < 2)
        return false;
    const prefix = data.subarray(0, 2);
    return DVRIP_HEADERS.some(h => h.equals(prefix));
}
function p32(value, bigEndian = false) {
    const buf = Buffer.alloc(4);
    if (bigEndian) {
        buf.writeUInt32BE(value);
    }
    else {
        buf.writeUInt32LE(value);
    }
    return buf;
}
function u32(data, bigEndian = false) {
    if (bigEndian) {
        return data.readUInt32BE(0);
    }
    return data.readUInt32LE(0);
}
function p64(value, bigEndian = false) {
    const buf = Buffer.alloc(8);
    if (bigEndian) {
        buf.writeBigUInt64BE(value);
    }
    else {
        buf.writeBigUInt64LE(value);
    }
    return buf;
}
class DahuaDVRIP {
    constructor(options) {
        this.socket = null;
        this.sessionId = 0;
        this.requestId = 0;
        this.running = false;
        this.loginPhase = false;
        this.keepaliveInterval = null;
        this.buffer = Buffer.alloc(0);
        this.loginDataResolver = null;
        this.pendingResolvers = new Map();
        this.host = options.host;
        this.port = options.port || 37777;
        this.username = options.username;
        this.password = options.password;
        this.console = options.console || console;
    }
    dahuaGen1Hash(password) {
        const md5 = crypto.createHash('md5');
        md5.update(password, 'latin1');
        const digest = md5.digest();
        const out = [];
        for (let i = 0; i < digest.length; i += 2) {
            let val = (digest[i] + digest[i + 1]) % 62;
            if (val < 10) {
                val += 48; // '0'-'9'
            }
            else if (val < 36) {
                val += 55; // 'A'-'Z'
            }
            else {
                val += 61; // 'a'-'z'
            }
            out.push(val);
        }
        return String.fromCharCode(...out);
    }
    dahuaGen2Md5Hash(random, realm, username, password) {
        // First hash: username:realm:password
        const pwddbHash = crypto.createHash('md5')
            .update(`${username}:${realm}:${password}`, 'latin1')
            .digest('hex')
            .toUpperCase();
        // Second hash: username:random:first_hash
        const randomHash = crypto.createHash('md5')
            .update(`${username}:${random}:${pwddbHash}`, 'latin1')
            .digest('hex')
            .toUpperCase();
        return randomHash;
    }
    dahuaDvripMd5Hash(random, username, password) {
        const gen1Hash = this.dahuaGen1Hash(password);
        const randomHash = crypto.createHash('md5')
            .update(`${username}:${random}:${gen1Hash}`, 'latin1')
            .digest('hex')
            .toUpperCase();
        return randomHash;
    }
    buildDvripAuthHash(random, realm, username, password) {
        const gen2 = this.dahuaGen2Md5Hash(random, realm, username, password);
        const gen1 = this.dahuaDvripMd5Hash(random, username, password);
        return `${username}&&${gen2}${gen1}`;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            this.socket.setTimeout(10000);
            this.socket.on('connect', () => {
                this.running = true;
                this.console.log(`[DVRIP] Connected to ${this.host}:${this.port}`);
                resolve();
            });
            this.socket.on('error', (err) => {
                this.console.error(`[DVRIP] Socket error: ${err.message}`);
                reject(err);
            });
            this.socket.on('timeout', () => {
                this.console.error('[DVRIP] Socket timeout');
                this.socket?.destroy();
                reject(new Error('Connection timeout'));
            });
            this.socket.on('data', (data) => {
                this.handleData(data);
            });
            this.socket.on('close', () => {
                this.running = false;
                this.console.log('[DVRIP] Connection closed');
            });
            this.socket.connect(this.port, this.host);
        });
    }
    handleData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        // During login phase, notify the login waiter
        if (this.loginPhase && this.loginDataResolver && this.buffer.length >= 32) {
            const resolver = this.loginDataResolver;
            this.loginDataResolver = null;
            const capturedData = this.buffer;
            this.buffer = Buffer.alloc(0);
            resolver(capturedData);
            return;
        }
        if (!this.loginPhase) {
            this.processBuffer();
        }
    }
    processBuffer() {
        while (this.buffer.length >= 32) {
            if (isDvripPacket(this.buffer)) {
                // Parse header to get expected data length
                const dataLen = this.buffer.readUInt32LE(4);
                const totalLen = 32 + dataLen;
                if (this.buffer.length >= totalLen) {
                    const packet = this.buffer.subarray(0, totalLen);
                    this.buffer = this.buffer.subarray(totalLen);
                    this.handlePacket(packet);
                }
                else {
                    break; // Need more data
                }
            }
            else {
                // Not a DVRIP packet - skip bytes until we find one
                let found = false;
                for (let i = 1; i < this.buffer.length - 1; i++) {
                    const prefix = this.buffer.subarray(i, i + 2);
                    if (DVRIP_HEADERS.some(h => h.equals(prefix))) {
                        this.buffer = this.buffer.subarray(i);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.buffer = this.buffer.subarray(-1);
                    break;
                }
            }
        }
    }
    handlePacket(packet) {
        const header = packet.subarray(0, 32);
        const data = packet.subarray(32);
        // Check if this is a JSON response
        if (header[0] === 0xf6 || header[0] === 0xb0) {
            if (data.length > 0) {
                try {
                    const text = data.toString('latin1');
                    const jsonStart = text.indexOf('{');
                    const jsonEnd = text.lastIndexOf('}') + 1;
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                        const jsonData = JSON.parse(text.substring(jsonStart, jsonEnd));
                        const id = jsonData.id;
                        if (id && this.pendingResolvers.has(id)) {
                            const resolver = this.pendingResolvers.get(id);
                            this.pendingResolvers.delete(id);
                            resolver.resolve(jsonData);
                        }
                    }
                }
                catch (e) {
                    // Not JSON or parse error
                }
            }
        }
    }
    async login() {
        if (!this.socket) {
            throw new Error('Not connected');
        }
        this.loginPhase = true;
        // Step 1: Send realm request
        const initHeader = Buffer.from([
            0xa0, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x05, 0x02, 0x01, 0x01,
            0x00, 0x00, 0xa1, 0xaa
        ]);
        this.console.log('[DVRIP] Sending login request...');
        this.socket.write(initHeader);
        // Wait for challenge response
        const challengeData = await this.waitForData(5000);
        if (!challengeData || challengeData.length < 32) {
            this.console.error('[DVRIP] No challenge response');
            this.loginPhase = false;
            return false;
        }
        const responseText = challengeData.subarray(32).toString('latin1');
        let realm = null;
        let random = null;
        for (const line of responseText.split('\n')) {
            if (line.startsWith('Realm:')) {
                realm = line.substring(6).trim();
            }
            else if (line.startsWith('Random:')) {
                random = line.substring(7).trim();
            }
        }
        if (!realm || !random) {
            this.console.error('[DVRIP] Failed to parse challenge');
            this.loginPhase = false;
            return false;
        }
        this.console.log(`[DVRIP] Realm: ${realm}, Random: ${random}`);
        // Step 2: Send authentication
        const authString = this.buildDvripAuthHash(random, realm, this.username, this.password);
        const authData = Buffer.from(authString, 'latin1');
        const authHeader = Buffer.concat([
            p32(0xa0050000, true),
            p32(authData.length),
            Buffer.alloc(16),
            p64(0x050200080000a1aan, true)
        ]);
        this.console.log('[DVRIP] Sending authentication...');
        this.socket.write(Buffer.concat([authHeader, authData]));
        // Wait for auth response
        const authResponse = await this.waitForData(5000);
        if (!authResponse || authResponse.length < 32) {
            this.console.error('[DVRIP] No auth response');
            this.loginPhase = false;
            return false;
        }
        const errorCode = authResponse.subarray(8, 10);
        if (errorCode[0] === 0x00 && errorCode[1] === 0x08) {
            this.sessionId = authResponse.readUInt32LE(16);
            this.console.log(`[DVRIP] Login successful! Session ID: ${this.sessionId}`);
            this.loginPhase = false;
            // Disable socket timeout after login - let keepalive manage the connection
            this.socket?.setTimeout(0);
            this.startKeepalive();
            return true;
        }
        this.console.error(`[DVRIP] Login failed with error code: ${errorCode.toString('hex')}`);
        this.loginPhase = false;
        return false;
    }
    waitForData(timeoutMs) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.loginDataResolver = null;
                resolve(this.buffer.length > 0 ? this.buffer : null);
                this.buffer = Buffer.alloc(0);
            }, timeoutMs);
            this.loginDataResolver = (data) => {
                clearTimeout(timeout);
                resolve(data);
            };
        });
    }
    startKeepalive() {
        this.keepaliveInterval = setInterval(() => {
            if (this.running) {
                this.sendCommand('global.keepAlive', { timeout: 30, active: true })
                    .catch(err => this.console.error('[DVRIP] Keepalive error:', err.message));
            }
        }, 25000);
    }
    async sendCommand(method, params = {}) {
        if (!this.socket || !this.running) {
            throw new Error('Not connected');
        }
        this.requestId++;
        const command = {
            method,
            params,
            id: this.requestId,
            session: this.sessionId
        };
        const jsonData = Buffer.from(JSON.stringify(command), 'latin1');
        const header = Buffer.concat([
            p32(0xf6000000, true),
            p32(jsonData.length),
            p32(this.requestId),
            p32(0),
            p32(jsonData.length),
            p32(0),
            p32(this.sessionId),
            p32(0)
        ]);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingResolvers.delete(this.requestId);
                reject(new Error(`Command timeout: ${method}`));
            }, 10000);
            this.pendingResolvers.set(this.requestId, {
                resolve: (data) => {
                    clearTimeout(timeout);
                    resolve(data);
                },
                reject: (err) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            });
            this.socket.write(Buffer.concat([header, jsonData]));
        });
    }
    async ptzControl(direction, speed = 5, action = 'start') {
        const params = {
            channel: 0,
            code: direction,
            arg1: action === 'start' ? speed : 0,
            arg2: action === 'start' ? speed : 0,
            arg3: 0,
            arg4: 0
        };
        const method = action === 'start' ? 'ptz.start' : 'ptz.stop';
        return this.sendCommand(method, params);
    }
    async ptzMove(direction, speed = 5, durationMs = 500) {
        await this.ptzControl(direction, speed, 'start');
        await new Promise(resolve => setTimeout(resolve, durationMs));
        await this.ptzControl(direction, 0, 'stop');
    }
    disconnect() {
        this.running = false;
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }
    isConnected() {
        return this.running && this.socket !== null;
    }
}
exports.DahuaDVRIP = DahuaDVRIP;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHZyaXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZHZyaXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBQzNCLCtDQUFpQztBQUVqQyw4QkFBOEI7QUFDOUIsTUFBTSxhQUFhLEdBQUc7SUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFHLGFBQWE7SUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFHLDJCQUEyQjtJQUN2RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUcsaUNBQWlDO0lBQzdELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRyxnQkFBZ0I7SUFDNUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFHLGdCQUFnQjtJQUM1QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUcseUJBQXlCO0lBQ3JELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRywwQkFBMEI7SUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFHLGFBQWE7Q0FDNUMsQ0FBQztBQUVGLFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDL0IsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuQyxP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QUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDO0lBQ2hELENBQUM7Q0FDSjtBQTlYRCxnQ0E4WEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG4vLyBWYWxpZCBEVlJJUCBwYWNrZXQgcHJlZml4ZXNcbmNvbnN0IERWUklQX0hFQURFUlMgPSBbXG4gICAgQnVmZmVyLmZyb20oWzB4YTAsIDB4MDBdKSwgIC8vIDNERVMgTG9naW5cbiAgICBCdWZmZXIuZnJvbShbMHhhMCwgMHgwMV0pLCAgLy8gRFZSSVAgU2VuZCBSZXF1ZXN0IFJlYWxtXG4gICAgQnVmZmVyLmZyb20oWzB4YTAsIDB4MDVdKSwgIC8vIERWUklQIGxvZ2luIFNlbmQgTG9naW4gRGV0YWlsc1xuICAgIEJ1ZmZlci5mcm9tKFsweGIwLCAweDAwXSksICAvLyBEVlJJUCBSZWNlaXZlXG4gICAgQnVmZmVyLmZyb20oWzB4YjAsIDB4MDFdKSwgIC8vIERWUklQIFJlY2VpdmVcbiAgICBCdWZmZXIuZnJvbShbMHhhMywgMHgwMV0pLCAgLy8gRFZSSVAgRGlzY292ZXIgUmVxdWVzdFxuICAgIEJ1ZmZlci5mcm9tKFsweGIzLCAweDAwXSksICAvLyBEVlJJUCBEaXNjb3ZlciBSZXNwb25zZVxuICAgIEJ1ZmZlci5mcm9tKFsweGY2LCAweDAwXSksICAvLyBEVlJJUCBKU09OXG5dO1xuXG5mdW5jdGlvbiBpc0R2cmlwUGFja2V0KGRhdGE6IEJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGlmIChkYXRhLmxlbmd0aCA8IDIpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBwcmVmaXggPSBkYXRhLnN1YmFycmF5KDAsIDIpO1xuICAgIHJldHVybiBEVlJJUF9IRUFERVJTLnNvbWUoaCA9PiBoLmVxdWFscyhwcmVmaXgpKTtcbn1cblxuZnVuY3Rpb24gcDMyKHZhbHVlOiBudW1iZXIsIGJpZ0VuZGlhbiA9IGZhbHNlKTogQnVmZmVyIHtcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MoNCk7XG4gICAgaWYgKGJpZ0VuZGlhbikge1xuICAgICAgICBidWYud3JpdGVVSW50MzJCRSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYnVmLndyaXRlVUludDMyTEUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmO1xufVxuXG5mdW5jdGlvbiB1MzIoZGF0YTogQnVmZmVyLCBiaWdFbmRpYW4gPSBmYWxzZSk6IG51bWJlciB7XG4gICAgaWYgKGJpZ0VuZGlhbikge1xuICAgICAgICByZXR1cm4gZGF0YS5yZWFkVUludDMyQkUoMCk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnJlYWRVSW50MzJMRSgwKTtcbn1cblxuZnVuY3Rpb24gcDY0KHZhbHVlOiBiaWdpbnQsIGJpZ0VuZGlhbiA9IGZhbHNlKTogQnVmZmVyIHtcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MoOCk7XG4gICAgaWYgKGJpZ0VuZGlhbikge1xuICAgICAgICBidWYud3JpdGVCaWdVSW50NjRCRSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYnVmLndyaXRlQmlnVUludDY0TEUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERWUklQT3B0aW9ucyB7XG4gICAgaG9zdDogc3RyaW5nO1xuICAgIHBvcnQ/OiBudW1iZXI7XG4gICAgdXNlcm5hbWU6IHN0cmluZztcbiAgICBwYXNzd29yZDogc3RyaW5nO1xuICAgIGNvbnNvbGU/OiBDb25zb2xlO1xufVxuXG5leHBvcnQgY2xhc3MgRGFodWFEVlJJUCB7XG4gICAgcHJpdmF0ZSBob3N0OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBwb3J0OiBudW1iZXI7XG4gICAgcHJpdmF0ZSB1c2VybmFtZTogc3RyaW5nO1xuICAgIHByaXZhdGUgcGFzc3dvcmQ6IHN0cmluZztcbiAgICBwcml2YXRlIHNvY2tldDogbmV0LlNvY2tldCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgc2Vzc2lvbklkOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgcmVxdWVzdElkOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgcnVubmluZzogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByaXZhdGUgbG9naW5QaGFzZTogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByaXZhdGUga2VlcGFsaXZlSW50ZXJ2YWw6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBidWZmZXI6IEJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICBwcml2YXRlIGxvZ2luRGF0YVJlc29sdmVyOiAoKGRhdGE6IEJ1ZmZlcikgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHBlbmRpbmdSZXNvbHZlcnM6IE1hcDxudW1iZXIsIHsgcmVzb2x2ZTogKGRhdGE6IGFueSkgPT4gdm9pZDsgcmVqZWN0OiAoZXJyOiBFcnJvcikgPT4gdm9pZCB9PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBEVlJJUE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5ob3N0ID0gb3B0aW9ucy5ob3N0O1xuICAgICAgICB0aGlzLnBvcnQgPSBvcHRpb25zLnBvcnQgfHwgMzc3Nzc7XG4gICAgICAgIHRoaXMudXNlcm5hbWUgPSBvcHRpb25zLnVzZXJuYW1lO1xuICAgICAgICB0aGlzLnBhc3N3b3JkID0gb3B0aW9ucy5wYXNzd29yZDtcbiAgICAgICAgdGhpcy5jb25zb2xlID0gb3B0aW9ucy5jb25zb2xlIHx8IGNvbnNvbGU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkYWh1YUdlbjFIYXNoKHBhc3N3b3JkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBtZDUgPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1Jyk7XG4gICAgICAgIG1kNS51cGRhdGUocGFzc3dvcmQsICdsYXRpbjEnKTtcbiAgICAgICAgY29uc3QgZGlnZXN0ID0gbWQ1LmRpZ2VzdCgpO1xuXG4gICAgICAgIGNvbnN0IG91dDogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWdlc3QubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSAoZGlnZXN0W2ldICsgZGlnZXN0W2kgKyAxXSkgJSA2MjtcbiAgICAgICAgICAgIGlmICh2YWwgPCAxMCkge1xuICAgICAgICAgICAgICAgIHZhbCArPSA0ODsgIC8vICcwJy0nOSdcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsIDwgMzYpIHtcbiAgICAgICAgICAgICAgICB2YWwgKz0gNTU7ICAvLyAnQSctJ1onXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbCArPSA2MTsgIC8vICdhJy0neidcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dC5wdXNoKHZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoLi4ub3V0KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGRhaHVhR2VuMk1kNUhhc2gocmFuZG9tOiBzdHJpbmcsIHJlYWxtOiBzdHJpbmcsIHVzZXJuYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICAvLyBGaXJzdCBoYXNoOiB1c2VybmFtZTpyZWFsbTpwYXNzd29yZFxuICAgICAgICBjb25zdCBwd2RkYkhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JylcbiAgICAgICAgICAgIC51cGRhdGUoYCR7dXNlcm5hbWV9OiR7cmVhbG19OiR7cGFzc3dvcmR9YCwgJ2xhdGluMScpXG4gICAgICAgICAgICAuZGlnZXN0KCdoZXgnKVxuICAgICAgICAgICAgLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgLy8gU2Vjb25kIGhhc2g6IHVzZXJuYW1lOnJhbmRvbTpmaXJzdF9oYXNoXG4gICAgICAgIGNvbnN0IHJhbmRvbUhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JylcbiAgICAgICAgICAgIC51cGRhdGUoYCR7dXNlcm5hbWV9OiR7cmFuZG9tfToke3B3ZGRiSGFzaH1gLCAnbGF0aW4xJylcbiAgICAgICAgICAgIC5kaWdlc3QoJ2hleCcpXG4gICAgICAgICAgICAudG9VcHBlckNhc2UoKTtcblxuICAgICAgICByZXR1cm4gcmFuZG9tSGFzaDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGRhaHVhRHZyaXBNZDVIYXNoKHJhbmRvbTogc3RyaW5nLCB1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgZ2VuMUhhc2ggPSB0aGlzLmRhaHVhR2VuMUhhc2gocGFzc3dvcmQpO1xuICAgICAgICBjb25zdCByYW5kb21IYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpXG4gICAgICAgICAgICAudXBkYXRlKGAke3VzZXJuYW1lfToke3JhbmRvbX06JHtnZW4xSGFzaH1gLCAnbGF0aW4xJylcbiAgICAgICAgICAgIC5kaWdlc3QoJ2hleCcpXG4gICAgICAgICAgICAudG9VcHBlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIHJhbmRvbUhhc2g7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZER2cmlwQXV0aEhhc2gocmFuZG9tOiBzdHJpbmcsIHJlYWxtOiBzdHJpbmcsIHVzZXJuYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBnZW4yID0gdGhpcy5kYWh1YUdlbjJNZDVIYXNoKHJhbmRvbSwgcmVhbG0sIHVzZXJuYW1lLCBwYXNzd29yZCk7XG4gICAgICAgIGNvbnN0IGdlbjEgPSB0aGlzLmRhaHVhRHZyaXBNZDVIYXNoKHJhbmRvbSwgdXNlcm5hbWUsIHBhc3N3b3JkKTtcbiAgICAgICAgcmV0dXJuIGAke3VzZXJuYW1lfSYmJHtnZW4yfSR7Z2VuMX1gO1xuICAgIH1cblxuICAgIGFzeW5jIGNvbm5lY3QoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNvY2tldCA9IG5ldyBuZXQuU29ja2V0KCk7XG4gICAgICAgICAgICB0aGlzLnNvY2tldC5zZXRUaW1lb3V0KDEwMDAwKTtcblxuICAgICAgICAgICAgdGhpcy5zb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbRFZSSVBdIENvbm5lY3RlZCB0byAke3RoaXMuaG9zdH06JHt0aGlzLnBvcnR9YCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoYFtEVlJJUF0gU29ja2V0IGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW0RWUklQXSBTb2NrZXQgdGltZW91dCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0Py5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ29ubmVjdGlvbiB0aW1lb3V0JykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZURhdGEoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5zb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tEVlJJUF0gQ29ubmVjdGlvbiBjbG9zZWQnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5jb25uZWN0KHRoaXMucG9ydCwgdGhpcy5ob3N0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVEYXRhKGRhdGE6IEJ1ZmZlcik6IHZvaWQge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoW3RoaXMuYnVmZmVyLCBkYXRhXSk7XG5cbiAgICAgICAgLy8gRHVyaW5nIGxvZ2luIHBoYXNlLCBub3RpZnkgdGhlIGxvZ2luIHdhaXRlclxuICAgICAgICBpZiAodGhpcy5sb2dpblBoYXNlICYmIHRoaXMubG9naW5EYXRhUmVzb2x2ZXIgJiYgdGhpcy5idWZmZXIubGVuZ3RoID49IDMyKSB7XG4gICAgICAgICAgICBjb25zdCByZXNvbHZlciA9IHRoaXMubG9naW5EYXRhUmVzb2x2ZXI7XG4gICAgICAgICAgICB0aGlzLmxvZ2luRGF0YVJlc29sdmVyID0gbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IGNhcHR1cmVkRGF0YSA9IHRoaXMuYnVmZmVyO1xuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBCdWZmZXIuYWxsb2MoMCk7XG4gICAgICAgICAgICByZXNvbHZlcihjYXB0dXJlZERhdGEpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLmxvZ2luUGhhc2UpIHtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0J1ZmZlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwcm9jZXNzQnVmZmVyKCk6IHZvaWQge1xuICAgICAgICB3aGlsZSAodGhpcy5idWZmZXIubGVuZ3RoID49IDMyKSB7XG4gICAgICAgICAgICBpZiAoaXNEdnJpcFBhY2tldCh0aGlzLmJ1ZmZlcikpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBoZWFkZXIgdG8gZ2V0IGV4cGVjdGVkIGRhdGEgbGVuZ3RoXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YUxlbiA9IHRoaXMuYnVmZmVyLnJlYWRVSW50MzJMRSg0KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3RhbExlbiA9IDMyICsgZGF0YUxlbjtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPj0gdG90YWxMZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2V0ID0gdGhpcy5idWZmZXIuc3ViYXJyYXkoMCwgdG90YWxMZW4pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyLnN1YmFycmF5KHRvdGFsTGVuKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQYWNrZXQocGFja2V0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhazsgIC8vIE5lZWQgbW9yZSBkYXRhXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBOb3QgYSBEVlJJUCBwYWNrZXQgLSBza2lwIGJ5dGVzIHVudGlsIHdlIGZpbmQgb25lXG4gICAgICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLmJ1ZmZlci5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlZml4ID0gdGhpcy5idWZmZXIuc3ViYXJyYXkoaSwgaSArIDIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoRFZSSVBfSEVBREVSUy5zb21lKGggPT4gaC5lcXVhbHMocHJlZml4KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuc3ViYXJyYXkoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuc3ViYXJyYXkoLTEpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVBhY2tldChwYWNrZXQ6IEJ1ZmZlcik6IHZvaWQge1xuICAgICAgICBjb25zdCBoZWFkZXIgPSBwYWNrZXQuc3ViYXJyYXkoMCwgMzIpO1xuICAgICAgICBjb25zdCBkYXRhID0gcGFja2V0LnN1YmFycmF5KDMyKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgSlNPTiByZXNwb25zZVxuICAgICAgICBpZiAoaGVhZGVyWzBdID09PSAweGY2IHx8IGhlYWRlclswXSA9PT0gMHhiMCkge1xuICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBkYXRhLnRvU3RyaW5nKCdsYXRpbjEnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvblN0YXJ0ID0gdGV4dC5pbmRleE9mKCd7Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb25FbmQgPSB0ZXh0Lmxhc3RJbmRleE9mKCd9JykgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoanNvblN0YXJ0ID49IDAgJiYganNvbkVuZCA+IGpzb25TdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbkRhdGEgPSBKU09OLnBhcnNlKHRleHQuc3Vic3RyaW5nKGpzb25TdGFydCwganNvbkVuZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSBqc29uRGF0YS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZCAmJiB0aGlzLnBlbmRpbmdSZXNvbHZlcnMuaGFzKGlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVyID0gdGhpcy5wZW5kaW5nUmVzb2x2ZXJzLmdldChpZCkhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGVuZGluZ1Jlc29sdmVycy5kZWxldGUoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVyLnJlc29sdmUoanNvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBOb3QgSlNPTiBvciBwYXJzZSBlcnJvclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGxvZ2luKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBpZiAoIXRoaXMuc29ja2V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBjb25uZWN0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9naW5QaGFzZSA9IHRydWU7XG5cbiAgICAgICAgLy8gU3RlcCAxOiBTZW5kIHJlYWxtIHJlcXVlc3RcbiAgICAgICAgY29uc3QgaW5pdEhlYWRlciA9IEJ1ZmZlci5mcm9tKFtcbiAgICAgICAgICAgIDB4YTAsIDB4MDEsIDB4MDAsIDB4MDAsXG4gICAgICAgICAgICAweDAwLCAweDAwLCAweDAwLCAweDAwLFxuICAgICAgICAgICAgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCxcbiAgICAgICAgICAgIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsXG4gICAgICAgICAgICAweDAwLCAweDAwLCAweDAwLCAweDAwLFxuICAgICAgICAgICAgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCxcbiAgICAgICAgICAgIDB4MDUsIDB4MDIsIDB4MDEsIDB4MDEsXG4gICAgICAgICAgICAweDAwLCAweDAwLCAweGExLCAweGFhXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tEVlJJUF0gU2VuZGluZyBsb2dpbiByZXF1ZXN0Li4uJyk7XG4gICAgICAgIHRoaXMuc29ja2V0LndyaXRlKGluaXRIZWFkZXIpO1xuXG4gICAgICAgIC8vIFdhaXQgZm9yIGNoYWxsZW5nZSByZXNwb25zZVxuICAgICAgICBjb25zdCBjaGFsbGVuZ2VEYXRhID0gYXdhaXQgdGhpcy53YWl0Rm9yRGF0YSg1MDAwKTtcbiAgICAgICAgaWYgKCFjaGFsbGVuZ2VEYXRhIHx8IGNoYWxsZW5nZURhdGEubGVuZ3RoIDwgMzIpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW0RWUklQXSBObyBjaGFsbGVuZ2UgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgIHRoaXMubG9naW5QaGFzZSA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzcG9uc2VUZXh0ID0gY2hhbGxlbmdlRGF0YS5zdWJhcnJheSgzMikudG9TdHJpbmcoJ2xhdGluMScpO1xuICAgICAgICBsZXQgcmVhbG06IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICBsZXQgcmFuZG9tOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgcmVzcG9uc2VUZXh0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnUmVhbG06JykpIHtcbiAgICAgICAgICAgICAgICByZWFsbSA9IGxpbmUuc3Vic3RyaW5nKDYpLnRyaW0oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdSYW5kb206JykpIHtcbiAgICAgICAgICAgICAgICByYW5kb20gPSBsaW5lLnN1YnN0cmluZyg3KS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXJlYWxtIHx8ICFyYW5kb20pIHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW0RWUklQXSBGYWlsZWQgdG8gcGFyc2UgY2hhbGxlbmdlJyk7XG4gICAgICAgICAgICB0aGlzLmxvZ2luUGhhc2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtEVlJJUF0gUmVhbG06ICR7cmVhbG19LCBSYW5kb206ICR7cmFuZG9tfWApO1xuXG4gICAgICAgIC8vIFN0ZXAgMjogU2VuZCBhdXRoZW50aWNhdGlvblxuICAgICAgICBjb25zdCBhdXRoU3RyaW5nID0gdGhpcy5idWlsZER2cmlwQXV0aEhhc2gocmFuZG9tLCByZWFsbSwgdGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XG4gICAgICAgIGNvbnN0IGF1dGhEYXRhID0gQnVmZmVyLmZyb20oYXV0aFN0cmluZywgJ2xhdGluMScpO1xuXG4gICAgICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBCdWZmZXIuY29uY2F0KFtcbiAgICAgICAgICAgIHAzMigweGEwMDUwMDAwLCB0cnVlKSxcbiAgICAgICAgICAgIHAzMihhdXRoRGF0YS5sZW5ndGgpLFxuICAgICAgICAgICAgQnVmZmVyLmFsbG9jKDE2KSxcbiAgICAgICAgICAgIHA2NCgweDA1MDIwMDA4MDAwMGExYWFuLCB0cnVlKVxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbRFZSSVBdIFNlbmRpbmcgYXV0aGVudGljYXRpb24uLi4nKTtcbiAgICAgICAgdGhpcy5zb2NrZXQud3JpdGUoQnVmZmVyLmNvbmNhdChbYXV0aEhlYWRlciwgYXV0aERhdGFdKSk7XG5cbiAgICAgICAgLy8gV2FpdCBmb3IgYXV0aCByZXNwb25zZVxuICAgICAgICBjb25zdCBhdXRoUmVzcG9uc2UgPSBhd2FpdCB0aGlzLndhaXRGb3JEYXRhKDUwMDApO1xuICAgICAgICBpZiAoIWF1dGhSZXNwb25zZSB8fCBhdXRoUmVzcG9uc2UubGVuZ3RoIDwgMzIpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW0RWUklQXSBObyBhdXRoIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICB0aGlzLmxvZ2luUGhhc2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVycm9yQ29kZSA9IGF1dGhSZXNwb25zZS5zdWJhcnJheSg4LCAxMCk7XG4gICAgICAgIGlmIChlcnJvckNvZGVbMF0gPT09IDB4MDAgJiYgZXJyb3JDb2RlWzFdID09PSAweDA4KSB7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb25JZCA9IGF1dGhSZXNwb25zZS5yZWFkVUludDMyTEUoMTYpO1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW0RWUklQXSBMb2dpbiBzdWNjZXNzZnVsISBTZXNzaW9uIElEOiAke3RoaXMuc2Vzc2lvbklkfWApO1xuICAgICAgICAgICAgdGhpcy5sb2dpblBoYXNlID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIHNvY2tldCB0aW1lb3V0IGFmdGVyIGxvZ2luIC0gbGV0IGtlZXBhbGl2ZSBtYW5hZ2UgdGhlIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIHRoaXMuc29ja2V0Py5zZXRUaW1lb3V0KDApO1xuICAgICAgICAgICAgdGhpcy5zdGFydEtlZXBhbGl2ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoYFtEVlJJUF0gTG9naW4gZmFpbGVkIHdpdGggZXJyb3IgY29kZTogJHtlcnJvckNvZGUudG9TdHJpbmcoJ2hleCcpfWApO1xuICAgICAgICB0aGlzLmxvZ2luUGhhc2UgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgd2FpdEZvckRhdGEodGltZW91dE1zOiBudW1iZXIpOiBQcm9taXNlPEJ1ZmZlciB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dpbkRhdGFSZXNvbHZlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLmJ1ZmZlci5sZW5ndGggPiAwID8gdGhpcy5idWZmZXIgOiBudWxsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICAgICAgICAgIH0sIHRpbWVvdXRNcyk7XG5cbiAgICAgICAgICAgIHRoaXMubG9naW5EYXRhUmVzb2x2ZXIgPSAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXJ0S2VlcGFsaXZlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLmtlZXBhbGl2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMucnVubmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VuZENvbW1hbmQoJ2dsb2JhbC5rZWVwQWxpdmUnLCB7IHRpbWVvdXQ6IDMwLCBhY3RpdmU6IHRydWUgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tEVlJJUF0gS2VlcGFsaXZlIGVycm9yOicsIGVyci5tZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDI1MDAwKTtcbiAgICB9XG5cbiAgICBhc3luYyBzZW5kQ29tbWFuZChtZXRob2Q6IHN0cmluZywgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge30pOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuc29ja2V0IHx8ICF0aGlzLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IGNvbm5lY3RlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0SWQrKztcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHtcbiAgICAgICAgICAgIG1ldGhvZCxcbiAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgIGlkOiB0aGlzLnJlcXVlc3RJZCxcbiAgICAgICAgICAgIHNlc3Npb246IHRoaXMuc2Vzc2lvbklkXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QganNvbkRhdGEgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShjb21tYW5kKSwgJ2xhdGluMScpO1xuXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IEJ1ZmZlci5jb25jYXQoW1xuICAgICAgICAgICAgcDMyKDB4ZjYwMDAwMDAsIHRydWUpLFxuICAgICAgICAgICAgcDMyKGpzb25EYXRhLmxlbmd0aCksXG4gICAgICAgICAgICBwMzIodGhpcy5yZXF1ZXN0SWQpLFxuICAgICAgICAgICAgcDMyKDApLFxuICAgICAgICAgICAgcDMyKGpzb25EYXRhLmxlbmd0aCksXG4gICAgICAgICAgICBwMzIoMCksXG4gICAgICAgICAgICBwMzIodGhpcy5zZXNzaW9uSWQpLFxuICAgICAgICAgICAgcDMyKDApXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wZW5kaW5nUmVzb2x2ZXJzLmRlbGV0ZSh0aGlzLnJlcXVlc3RJZCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgQ29tbWFuZCB0aW1lb3V0OiAke21ldGhvZH1gKSk7XG4gICAgICAgICAgICB9LCAxMDAwMCk7XG5cbiAgICAgICAgICAgIHRoaXMucGVuZGluZ1Jlc29sdmVycy5zZXQodGhpcy5yZXF1ZXN0SWQsIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZWplY3Q6IChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5zb2NrZXQhLndyaXRlKEJ1ZmZlci5jb25jYXQoW2hlYWRlciwganNvbkRhdGFdKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIHB0ekNvbnRyb2woZGlyZWN0aW9uOiBzdHJpbmcsIHNwZWVkOiBudW1iZXIgPSA1LCBhY3Rpb246ICdzdGFydCcgfCAnc3RvcCcgPSAnc3RhcnQnKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgY2hhbm5lbDogMCxcbiAgICAgICAgICAgIGNvZGU6IGRpcmVjdGlvbixcbiAgICAgICAgICAgIGFyZzE6IGFjdGlvbiA9PT0gJ3N0YXJ0JyA/IHNwZWVkIDogMCxcbiAgICAgICAgICAgIGFyZzI6IGFjdGlvbiA9PT0gJ3N0YXJ0JyA/IHNwZWVkIDogMCxcbiAgICAgICAgICAgIGFyZzM6IDAsXG4gICAgICAgICAgICBhcmc0OiAwXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbWV0aG9kID0gYWN0aW9uID09PSAnc3RhcnQnID8gJ3B0ei5zdGFydCcgOiAncHR6LnN0b3AnO1xuICAgICAgICByZXR1cm4gdGhpcy5zZW5kQ29tbWFuZChtZXRob2QsIHBhcmFtcyk7XG4gICAgfVxuXG4gICAgYXN5bmMgcHR6TW92ZShkaXJlY3Rpb246IHN0cmluZywgc3BlZWQ6IG51bWJlciA9IDUsIGR1cmF0aW9uTXM6IG51bWJlciA9IDUwMCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnB0ekNvbnRyb2woZGlyZWN0aW9uLCBzcGVlZCwgJ3N0YXJ0Jyk7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBkdXJhdGlvbk1zKSk7XG4gICAgICAgIGF3YWl0IHRoaXMucHR6Q29udHJvbChkaXJlY3Rpb24sIDAsICdzdG9wJyk7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmtlZXBhbGl2ZUludGVydmFsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMua2VlcGFsaXZlSW50ZXJ2YWwpO1xuICAgICAgICAgICAgdGhpcy5rZWVwYWxpdmVJbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc29ja2V0KSB7XG4gICAgICAgICAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gICAgICAgICAgICB0aGlzLnNvY2tldCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc0Nvbm5lY3RlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucnVubmluZyAmJiB0aGlzLnNvY2tldCAhPT0gbnVsbDtcbiAgICB9XG59XG4iXX0=

/***/ },

/***/ "./src/main.ts"
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
const sdk_1 = __importStar(__webpack_require__(/*! @scrypted/sdk */ "./node_modules/@scrypted/sdk/dist/src/index.js"));
const dvrip_1 = __webpack_require__(/*! ./dvrip */ "./src/dvrip.ts");
const onvif_server_1 = __webpack_require__(/*! ./onvif-server */ "./src/onvif-server.ts");
const os = __importStar(__webpack_require__(/*! os */ "os"));
const { deviceManager, mediaManager } = sdk_1.default;
class AmcrestASH21Camera extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId) {
        super(nativeId);
        this.dvrip = null;
        this.dvripConnecting = null;
        this.onvifServer = null;
        this.onvifServerStarting = null;
        // PTZ Capabilities
        this.ptzCapabilities = {
            pan: true,
            tilt: true,
            zoom: true,
        };
        // Start ONVIF server if enabled
        this.initOnvifServer();
    }
    async initOnvifServer() {
        if (!this.isOnvifEnabled()) {
            return;
        }
        try {
            await this.startOnvifServer();
        }
        catch (e) {
            this.console.error('[ONVIF] Failed to start server:', e.message);
        }
    }
    getHost() {
        return this.storage.getItem('host') || '';
    }
    getUsername() {
        return this.storage.getItem('username') || 'admin';
    }
    getPassword() {
        return this.storage.getItem('password') || '';
    }
    getRtspPort() {
        return parseInt(this.storage.getItem('rtspPort') || '554');
    }
    getDvripPort() {
        return parseInt(this.storage.getItem('dvripPort') || '37777');
    }
    isOnvifEnabled() {
        return this.storage.getItem('onvifEnabled') === 'true';
    }
    getOnvifPort() {
        return parseInt(this.storage.getItem('onvifPort') || '8080');
    }
    getOnvifIp() {
        const stored = this.storage.getItem('onvifIp');
        if (stored)
            return stored;
        // Try to auto-detect the server's IP
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }
    async startOnvifServer() {
        if (this.onvifServer) {
            return;
        }
        if (this.onvifServerStarting) {
            await this.onvifServerStarting;
            return;
        }
        this.onvifServerStarting = (async () => {
            const host = this.getHost();
            if (!host) {
                throw new Error('Camera IP not configured');
            }
            const onvifIp = this.getOnvifIp();
            const onvifPort = this.getOnvifPort();
            this.onvifServer = new onvif_server_1.OnvifServer({
                httpPort: onvifPort,
                rtspUrl: this.getRtspUrl(0),
                deviceName: `Amcrest ASH21 (${host})`,
                manufacturer: 'Amcrest',
                model: 'ASH21',
                serialNumber: host.replace(/\./g, ''),
                hardwareId: 'ASH21-PTZ',
                macAddress: '00:00:00:00:00:00',
                ipAddress: onvifIp,
                console: this.console,
            });
            // Listen for PTZ commands from ONVIF and translate to DVRIP
            this.onvifServer.on('ptz', async (command) => {
                try {
                    await this.handleOnvifPtz(command);
                }
                catch (e) {
                    this.console.error('[ONVIF] PTZ command error:', e.message);
                }
            });
            await this.onvifServer.start();
            this.console.log(`[ONVIF] Server started at http://${onvifIp}:${onvifPort}/onvif/device_service`);
        })();
        try {
            await this.onvifServerStarting;
        }
        finally {
            this.onvifServerStarting = null;
        }
    }
    async stopOnvifServer() {
        if (this.onvifServer) {
            await this.onvifServer.stop();
            this.onvifServer = null;
        }
    }
    async handleOnvifPtz(command) {
        const dvrip = await this.ensureDvripConnected();
        const getSpeed = (value) => {
            if (value === undefined || value === 0)
                return 0;
            return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
        };
        if (command.type === 'stop') {
            // Stop all movement
            await dvrip.ptzControl('Left', 0, 'stop').catch(() => { });
            await dvrip.ptzControl('Up', 0, 'stop').catch(() => { });
            await dvrip.ptzControl('ZoomIn', 0, 'stop').catch(() => { });
            return;
        }
        const pan = command.pan || 0;
        const tilt = command.tilt || 0;
        const zoom = command.zoom || 0;
        if (command.type === 'continuous') {
            // Continuous move - start movement in direction
            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                await dvrip.ptzControl(direction, getSpeed(pan), 'start');
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                await dvrip.ptzControl(direction, getSpeed(tilt), 'start');
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                await dvrip.ptzControl(direction, getSpeed(zoom), 'start');
            }
        }
        else if (command.type === 'relative') {
            // Relative move - move briefly then stop
            const duration = 300; // ms
            if (pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                await dvrip.ptzControl(direction, getSpeed(pan), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
            if (tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                await dvrip.ptzControl(direction, getSpeed(tilt), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
            if (zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                await dvrip.ptzControl(direction, getSpeed(zoom), 'start');
                setTimeout(() => dvrip.ptzControl(direction, 0, 'stop').catch(() => { }), duration);
            }
        }
    }
    getRtspUrl(subtype = 0) {
        const host = this.getHost();
        const username = encodeURIComponent(this.getUsername());
        const password = encodeURIComponent(this.getPassword());
        const port = this.getRtspPort();
        return `rtsp://${username}:${password}@${host}:${port}/cam/realmonitor?channel=1&subtype=${subtype}`;
    }
    async getSettings() {
        const onvifIp = this.getOnvifIp();
        const onvifPort = this.getOnvifPort();
        const onvifUrl = `http://${onvifIp}:${onvifPort}/onvif/device_service`;
        return [
            {
                key: 'host',
                title: 'Camera IP Address',
                value: this.getHost(),
                type: 'string',
                placeholder: '192.168.1.100',
            },
            {
                key: 'username',
                title: 'Username',
                value: this.getUsername(),
                type: 'string',
            },
            {
                key: 'password',
                title: 'Password',
                value: this.getPassword(),
                type: 'password',
            },
            {
                key: 'rtspPort',
                title: 'RTSP Port',
                value: this.getRtspPort().toString(),
                type: 'number',
                placeholder: '554',
            },
            {
                key: 'dvripPort',
                title: 'DVRIP Port (for PTZ)',
                value: this.getDvripPort().toString(),
                type: 'number',
                placeholder: '37777',
            },
            {
                key: 'onvifEnabled',
                title: 'Enable ONVIF Server',
                description: 'Expose this camera as an ONVIF device with PTZ support',
                value: this.isOnvifEnabled(),
                type: 'boolean',
            },
            {
                key: 'onvifPort',
                title: 'ONVIF Server Port',
                description: this.isOnvifEnabled() ? `ONVIF URL: ${onvifUrl}` : 'Enable ONVIF server to see URL',
                value: onvifPort.toString(),
                type: 'number',
                placeholder: '8080',
            },
            {
                key: 'onvifIp',
                title: 'ONVIF Server IP',
                description: 'IP address for ONVIF discovery (auto-detected if empty)',
                value: this.storage.getItem('onvifIp') || '',
                type: 'string',
                placeholder: onvifIp,
            },
        ];
    }
    async putSetting(key, value) {
        this.storage.setItem(key, value != null ? String(value) : '');
        // Disconnect DVRIP on connection settings change
        if (['host', 'username', 'password', 'dvripPort'].includes(key)) {
            if (this.dvrip) {
                this.dvrip.disconnect();
                this.dvrip = null;
            }
        }
        // Handle ONVIF server changes
        if (key === 'onvifEnabled') {
            if (value === true || value === 'true') {
                await this.startOnvifServer();
            }
            else {
                await this.stopOnvifServer();
            }
        }
        else if (['onvifPort', 'onvifIp', 'host'].includes(key) && this.isOnvifEnabled()) {
            // Restart ONVIF server with new settings
            await this.stopOnvifServer();
            await this.startOnvifServer();
        }
    }
    async ensureDvripConnected() {
        if (this.dvrip?.isConnected()) {
            return this.dvrip;
        }
        if (this.dvripConnecting) {
            await this.dvripConnecting;
            if (this.dvrip?.isConnected()) {
                return this.dvrip;
            }
        }
        this.dvripConnecting = (async () => {
            const host = this.getHost();
            if (!host) {
                throw new Error('Camera IP not configured');
            }
            this.dvrip = new dvrip_1.DahuaDVRIP({
                host,
                port: this.getDvripPort(),
                username: this.getUsername(),
                password: this.getPassword(),
                console: this.console,
            });
            try {
                await this.dvrip.connect();
                const success = await this.dvrip.login();
                return success;
            }
            catch (e) {
                this.dvrip.disconnect();
                this.dvrip = null;
                throw e;
            }
        })();
        const success = await this.dvripConnecting;
        this.dvripConnecting = null;
        if (!success) {
            throw new Error('DVRIP login failed');
        }
        return this.dvrip;
    }
    // VideoCamera interface
    async getVideoStream(options) {
        const subtype = options?.id === 'substream' ? 1 : 0;
        const rtspUrl = this.getRtspUrl(subtype);
        const ffmpegInput = {
            url: rtspUrl,
            inputArguments: [
                '-rtsp_transport', 'tcp',
                '-i', rtspUrl,
            ],
        };
        return mediaManager.createFFmpegMediaObject(ffmpegInput);
    }
    async getVideoStreamOptions() {
        return [
            {
                id: 'mainstream',
                name: 'Main Stream',
                video: {
                    codec: 'h264',
                },
                audio: {
                    codec: 'aac',
                },
            },
            {
                id: 'substream',
                name: 'Sub Stream',
                video: {
                    codec: 'h264',
                },
                audio: {
                    codec: 'aac',
                },
            },
        ];
    }
    // Camera interface
    async takePicture(options) {
        // Use FFmpeg to grab a frame from RTSP
        const rtspUrl = this.getRtspUrl(1); // Use substream for faster snapshot
        const ffmpegInput = {
            url: rtspUrl,
            inputArguments: [
                '-rtsp_transport', 'tcp',
                '-i', rtspUrl,
                '-frames:v', '1',
                '-f', 'image2',
            ],
        };
        return mediaManager.createFFmpegMediaObject(ffmpegInput);
    }
    async getPictureOptions() {
        return [];
    }
    // Cleanup when device is released
    async release() {
        await this.stopOnvifServer();
        if (this.dvrip) {
            this.dvrip.disconnect();
            this.dvrip = null;
        }
    }
    // PanTiltZoom interface
    async ptzCommand(command) {
        const dvrip = await this.ensureDvripConnected();
        // Map normalized values (-1 to 1) to DVRIP commands
        // Speed is derived from magnitude
        const getSpeed = (value) => {
            if (value === undefined)
                return 0;
            return Math.min(8, Math.max(1, Math.ceil(Math.abs(value) * 8)));
        };
        const pan = command.pan;
        const tilt = command.tilt;
        const zoom = command.zoom;
        try {
            // Handle pan
            if (pan !== undefined && pan !== 0) {
                const direction = pan > 0 ? 'Right' : 'Left';
                const speed = getSpeed(pan);
                await dvrip.ptzControl(direction, speed, 'start');
                // Stop after brief movement for relative control
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
            // Handle tilt
            if (tilt !== undefined && tilt !== 0) {
                const direction = tilt > 0 ? 'Up' : 'Down';
                const speed = getSpeed(tilt);
                await dvrip.ptzControl(direction, speed, 'start');
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
            // Handle zoom
            if (zoom !== undefined && zoom !== 0) {
                const direction = zoom > 0 ? 'ZoomIn' : 'ZoomOut';
                const speed = getSpeed(zoom);
                await dvrip.ptzControl(direction, speed, 'start');
                setTimeout(async () => {
                    try {
                        await dvrip.ptzControl(direction, 0, 'stop');
                    }
                    catch (e) {
                        // Ignore stop errors
                    }
                }, 200);
            }
        }
        catch (e) {
            this.console.error('PTZ command error:', e.message);
            throw e;
        }
    }
}
class AmcrestASH21Provider extends sdk_1.ScryptedDeviceBase {
    constructor(nativeId) {
        super(nativeId);
        this.cameras = new Map();
    }
    async getSettings() {
        return [
            {
                key: 'addCamera',
                title: 'Add Camera',
                description: 'Enter the camera IP address to add a new Amcrest ASH21 camera',
                type: 'string',
                placeholder: '192.168.1.100',
            },
        ];
    }
    async putSetting(key, value) {
        if (key === 'addCamera' && value) {
            const ip = String(value);
            await this.addCamera(ip);
        }
    }
    async addCamera(ip) {
        const nativeId = `amcrest-ash21-${ip.replace(/\./g, '-')}`;
        await deviceManager.onDeviceDiscovered({
            nativeId,
            name: `Amcrest ASH21 (${ip})`,
            type: sdk_1.ScryptedDeviceType.Camera,
            interfaces: [
                sdk_1.ScryptedInterface.Camera,
                sdk_1.ScryptedInterface.VideoCamera,
                sdk_1.ScryptedInterface.PanTiltZoom,
                sdk_1.ScryptedInterface.Settings,
            ],
        });
        // Set default host after device is created
        const device = await this.getDevice(nativeId);
        if (device && device.storage) {
            device.storage.setItem('host', ip);
        }
    }
    async getDevice(nativeId) {
        let camera = this.cameras.get(nativeId);
        if (!camera) {
            camera = new AmcrestASH21Camera(nativeId);
            this.cameras.set(nativeId, camera);
        }
        return camera;
    }
    async releaseDevice(id, nativeId) {
        const camera = this.cameras.get(nativeId);
        if (camera) {
            await camera.release();
            this.cameras.delete(nativeId);
        }
    }
}
exports["default"] = new AmcrestASH21Provider();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBa0J1QjtBQUN2QixtQ0FBcUM7QUFDckMsaURBQTZDO0FBQzdDLHVDQUF5QjtBQUV6QixNQUFNLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxHQUFHLGFBQUcsQ0FBQztBQUU1QyxNQUFNLGtCQUFtQixTQUFRLHdCQUFrQjtJQU0vQyxZQUFZLFFBQWdCO1FBQ3hCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQU5aLFVBQUssR0FBc0IsSUFBSSxDQUFDO1FBQ2hDLG9CQUFlLEdBQTRCLElBQUksQ0FBQztRQUNoRCxnQkFBVyxHQUF1QixJQUFJLENBQUM7UUFDdkMsd0JBQW1CLEdBQXlCLElBQUksQ0FBQztRQW9CekQsbUJBQW1CO1FBQ25CLG9CQUFlLEdBQTRCO1lBQ3ZDLEdBQUcsRUFBRSxJQUFJO1lBQ1QsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtTQUNiLENBQUM7UUFyQkUsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWU7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLE9BQU87UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRSxDQUFDO0lBQ0wsQ0FBQztJQVNPLE9BQU87UUFDWCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFD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MUQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUMzQyxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDM0QsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUNsRCxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDM0QsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkYsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0lBRU8sVUFBVSxDQUFDLFVBQWtCLENBQUM7UUFDbEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNoQyxPQUFPLFVBQVUsUUFBUSxJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksSUFBSSxzQ0FBc0MsT0FBTyxFQUFFLENBQUM7SUFDekcsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXO1FBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRyxVQUFVLE9BQU8sSUFBSSxTQUFTLHVCQUF1QixDQUFDO1FBRXZFLE9BQU87WUFDSDtnQkFDSSxHQUFHLEVBQUUsTUFBTTtnQkFDWCxLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLGVBQWU7YUFDL0I7WUFDRDtnQkFDSSxHQUFHLEVBQUUsVUFBVTtnQkFDZixLQUFLLEVBQUUsVUFBVTtnQkFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ3pCLElBQUksRUFBRSxRQUFRO2FBQ2pCO1lBQ0Q7Z0JBQ0ksR0FBRyxFQUFFLFVBQVU7Z0JBQ2YsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUN6QixJQUFJLEVBQUUsVUFBVTthQUNuQjtZQUNEO2dCQUNJLEdBQUcsRUFBRSxVQUFVO2dCQUNmLEtBQUssRUFBRSxXQUFXO2dCQUNsQixLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsRUFBRTtnQkFDcEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEtBQUs7YUFDckI7WUFDRDtnQkFDSSxHQUFHLEVBQUUsV0FBVztnQkFDaEIsS0FBSyxFQUFFLHNCQUFzQjtnQkFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxPQUFPO2FBQ3ZCO1lBQ0Q7Z0JBQ0ksR0FBRyxFQUFFLGNBQWM7Z0JBQ25CLEtBQUssRUFBRSxxQkFBcUI7Z0JBQzVCLFdBQVcsRUFBRSx3REFBd0Q7Z0JBQ3JFLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM1QixJQUFJLEVBQUUsU0FBUzthQUNsQjtZQUNEO2dCQUNJLEdBQUcsRUFBRSxXQUFXO2dCQUNoQixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7Z0JBQ2hHLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFO2dCQUMzQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsTUFBTTthQUN0QjtZQUNEO2dCQUNJLEdBQUcsRUFBRSxTQUFTO2dCQUNkLEtBQUssRUFBRSxpQkFBaUI7Z0JBQ3hCLFdBQVcsRUFBRSx5REFBeUQ7Z0JBQ3RFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO2dCQUM1QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsT0FBTzthQUN2QjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFXLEVBQUUsS0FBbUI7UUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFOUQsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5RCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUN0QixDQUFDO1FBQ0wsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixJQUFJLEdBQUcsS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUNyQyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDSixNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNqQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUNqRix5Q0FBeUM7WUFDekMsTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0I7UUFDOUIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3RCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDM0IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztZQUN0QixDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUMvQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGtCQUFVLENBQUM7Z0JBQ3hCLElBQUk7Z0JBQ0osSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQ3pCLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUM1QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDNUIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2FBQ3hCLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQztnQkFDRCxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDekMsT0FBTyxPQUFPLENBQUM7WUFDbkIsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ2xCLE1BQU0sQ0FBQyxDQUFDO1lBQ1osQ0FBQztRQUNMLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFTCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDM0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFFNUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVELHdCQUF3QjtJQUN4QixLQUFLLENBQUMsY0FBYyxDQUFDLE9BQTRCO1FBQzdDLE1BQU0sT0FBTyxHQUFHLE9BQU8sRUFBRSxFQUFFLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXpDLE1BQU0sV0FBVyxHQUFnQjtZQUM3QixHQUFHLEVBQUUsT0FBTztZQUNaLGNBQWMsRUFBRTtnQkFDWixpQkFBaUIsRUFBRSxLQUFLO2dCQUN4QixJQUFJLEVBQUUsT0FBTzthQUNoQjtTQUNKLENBQUM7UUFFRixPQUFPLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUN2QixPQUFPO1lBQ0g7Z0JBQ0ksRUFBRSxFQUFFLFlBQVk7Z0JBQ2hCLElBQUksRUFBRSxhQUFhO2dCQUNuQixLQUFLLEVBQUU7b0JBQ0gsS0FBSyxFQUFFLE1BQU07aUJBQ2hCO2dCQUNELEtBQUssRUFBRTtvQkFDSCxLQUFLLEVBQUUsS0FBSztpQkFDZjthQUNKO1lBQ0Q7Z0JBQ0ksRUFBRSxFQUFFLFdBQVc7Z0JBQ2YsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDSCxLQUFLLEVBQUUsTUFBTTtpQkFDaEI7Z0JBQ0QsS0FBSyxFQUFFO29CQUNILEtBQUssRUFBRSxLQUFLO2lCQUNmO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELG1CQUFtQjtJQUNuQixLQUFLLENBQUMsV0FBVyxDQUFDLE9BQWE7UUFDM0IsdUNBQXVDO1FBQ3ZDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxvQ0FBb0M7UUFFekUsTUFBTSxXQUFXLEdBQWdCO1lBQzdCLEdBQUcsRUFBRSxPQUFPO1lBQ1osY0FBYyxFQUFFO2dCQUNaLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSxHQUFHO2dCQUNoQixJQUFJLEVBQUUsUUFBUTthQUNqQjtTQUNKLENBQUM7UUFFRixPQUFPLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQjtRQUNuQixPQUFPLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxrQ0FBa0M7SUFDbEMsS0FBSyxDQUFDLE9BQU87UUFDVCxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM3QixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDdEIsQ0FBQztJQUNMLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUEyQjtRQUN4QyxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRWhELG9EQUFvRDtRQUNwRCxrQ0FBa0M7UUFDbEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUF5QixFQUFVLEVBQUU7WUFDbkQsSUFBSSxLQUFLLEtBQUssU0FBUztnQkFBRSxPQUFPLENBQUMsQ0FBQztZQUNsQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsQ0FBQyxDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFFMUIsSUFBSSxDQUFDO1lBQ0QsYUFBYTtZQUNiLElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sU0FBUyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUM3QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVCLE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCxpREFBaUQ7Z0JBQ2pELFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEIsSUFBSSxDQUFDO3dCQUNELE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNqRCxDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1QscUJBQXFCO29CQUN6QixDQUFDO2dCQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNaLENBQUM7WUFFRCxjQUFjO1lBQ2QsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQzNDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEIsSUFBSSxDQUFDO3dCQUNELE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNqRCxDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1QscUJBQXFCO29CQUN6QixDQUFDO2dCQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNaLENBQUM7WUFFRCxjQUFjO1lBQ2QsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQ2xELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEIsSUFBSSxDQUFDO3dCQUNELE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNqRCxDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1QscUJBQXFCO29CQUN6QixDQUFDO2dCQUNMLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNaLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsQ0FBQztRQUNaLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFFRCxNQUFNLG9CQUFxQixTQUFRLHdCQUFrQjtJQUdqRCxZQUFZLFFBQWlCO1FBQ3pCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUhaLFlBQU8sR0FBb0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUk3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDYixPQUFPO1lBQ0g7Z0JBQ0ksR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixXQUFXLEVBQUUsK0RBQStEO2dCQUM1RSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsZUFBZTthQUMvQjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFXLEVBQUUsS0FBbUI7UUFDN0MsSUFBSSxHQUFHLEtBQUssV0FBVyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQy9CLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0IsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQVU7UUFDOUIsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFFM0QsTUFBTSxhQUFhLENBQUMsa0JBQWtCLENBQUM7WUFDbkMsUUFBUTtZQUNSLElBQUksRUFBRSxrQkFBa0IsRUFBRSxHQUFHO1lBQzdCLElBQUksRUFBRSx3QkFBa0IsQ0FBQyxNQUFNO1lBQy9CLFVBQVUsRUFBRTtnQkFDUix1QkFBaUIsQ0FBQyxNQUFNO2dCQUN4Qix1QkFBaUIsQ0FBQyxXQUFXO2dCQUM3Qix1QkFBaUIsQ0FBQyxXQUFXO2dCQUM3Qix1QkFBaUIsQ0FBQyxRQUFRO2FBQzdCO1NBQ0osQ0FBQyxDQUFDO1FBRUgsMkNBQTJDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFnQjtRQUM1QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDVixNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1QsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQUVELGtCQUFlLElBQUksb0JBQW9CLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzZGssIHtcbiAgICBDYW1lcmEsXG4gICAgRGV2aWNlUHJvdmlkZXIsXG4gICAgRkZtcGVnSW5wdXQsXG4gICAgTWVkaWFPYmplY3QsXG4gICAgTWVkaWFTdHJlYW1PcHRpb25zLFxuICAgIFBhblRpbHRab29tLFxuICAgIFBhblRpbHRab29tQ2FwYWJpbGl0aWVzLFxuICAgIFBhblRpbHRab29tQ29tbWFuZCxcbiAgICBSZXNwb25zZU1lZGlhU3RyZWFtT3B0aW9ucyxcbiAgICBSZXNwb25zZVBpY3R1cmVPcHRpb25zLFxuICAgIFNjcnlwdGVkRGV2aWNlQmFzZSxcbiAgICBTY3J5cHRlZERldmljZVR5cGUsXG4gICAgU2NyeXB0ZWRJbnRlcmZhY2UsXG4gICAgU2V0dGluZyxcbiAgICBTZXR0aW5ncyxcbiAgICBTZXR0aW5nVmFsdWUsXG4gICAgVmlkZW9DYW1lcmEsXG59IGZyb20gJ0BzY3J5cHRlZC9zZGsnO1xuaW1wb3J0IHsgRGFodWFEVlJJUCB9IGZyb20gJy4vZHZyaXAnO1xuaW1wb3J0IHsgT252aWZTZXJ2ZXIgfSBmcm9tICcuL29udmlmLXNlcnZlcic7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5cbmNvbnN0IHsgZGV2aWNlTWFuYWdlciwgbWVkaWFNYW5hZ2VyIH0gPSBzZGs7XG5cbmNsYXNzIEFtY3Jlc3RBU0gyMUNhbWVyYSBleHRlbmRzIFNjcnlwdGVkRGV2aWNlQmFzZSBpbXBsZW1lbnRzIENhbWVyYSwgVmlkZW9DYW1lcmEsIFBhblRpbHRab29tLCBTZXR0aW5ncyB7XG4gICAgcHJpdmF0ZSBkdnJpcDogRGFodWFEVlJJUCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZHZyaXBDb25uZWN0aW5nOiBQcm9taXNlPGJvb2xlYW4+IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBvbnZpZlNlcnZlcjogT252aWZTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIG9udmlmU2VydmVyU3RhcnRpbmc6IFByb21pc2U8dm9pZD4gfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKG5hdGl2ZUlkOiBzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIobmF0aXZlSWQpO1xuICAgICAgICAvLyBTdGFydCBPTlZJRiBzZXJ2ZXIgaWYgZW5hYmxlZFxuICAgICAgICB0aGlzLmluaXRPbnZpZlNlcnZlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW5pdE9udmlmU2VydmVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuaXNPbnZpZkVuYWJsZWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RhcnRPbnZpZlNlcnZlcigpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS5lcnJvcignW09OVklGXSBGYWlsZWQgdG8gc3RhcnQgc2VydmVyOicsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQVFogQ2FwYWJpbGl0aWVzXG4gICAgcHR6Q2FwYWJpbGl0aWVzOiBQYW5UaWx0Wm9vbUNhcGFiaWxpdGllcyA9IHtcbiAgICAgICAgcGFuOiB0cnVlLFxuICAgICAgICB0aWx0OiB0cnVlLFxuICAgICAgICB6b29tOiB0cnVlLFxuICAgIH07XG5cbiAgICBwcml2YXRlIGdldEhvc3QoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZS5nZXRJdGVtKCdob3N0JykgfHwgJyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRVc2VybmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlLmdldEl0ZW0oJ3VzZXJuYW1lJykgfHwgJ2FkbWluJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFBhc3N3b3JkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgncGFzc3dvcmQnKSB8fCAnJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFJ0c3BQb3J0KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgncnRzcFBvcnQnKSB8fCAnNTU0Jyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXREdnJpcFBvcnQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRoaXMuc3RvcmFnZS5nZXRJdGVtKCdkdnJpcFBvcnQnKSB8fCAnMzc3NzcnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzT252aWZFbmFibGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlLmdldEl0ZW0oJ29udmlmRW5hYmxlZCcpID09PSAndHJ1ZSc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRPbnZpZlBvcnQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRoaXMuc3RvcmFnZS5nZXRJdGVtKCdvbnZpZlBvcnQnKSB8fCAnODA4MCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0T252aWZJcCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBzdG9yZWQgPSB0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgnb252aWZJcCcpO1xuICAgICAgICBpZiAoc3RvcmVkKSByZXR1cm4gc3RvcmVkO1xuXG4gICAgICAgIC8vIFRyeSB0byBhdXRvLWRldGVjdCB0aGUgc2VydmVyJ3MgSVBcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlcyA9IG9zLm5ldHdvcmtJbnRlcmZhY2VzKCk7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhpbnRlcmZhY2VzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZmFjZSBvZiBpbnRlcmZhY2VzW25hbWVdIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlmYWNlLmZhbWlseSA9PT0gJ0lQdjQnICYmICFpZmFjZS5pbnRlcm5hbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWZhY2UuYWRkcmVzcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcxMjcuMC4wLjEnO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnRPbnZpZlNlcnZlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMub252aWZTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLm9udmlmU2VydmVyU3RhcnRpbmcpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub252aWZTZXJ2ZXJTdGFydGluZztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub252aWZTZXJ2ZXJTdGFydGluZyA9IChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRIb3N0KCk7XG4gICAgICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbWVyYSBJUCBub3QgY29uZmlndXJlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBvbnZpZklwID0gdGhpcy5nZXRPbnZpZklwKCk7XG4gICAgICAgICAgICBjb25zdCBvbnZpZlBvcnQgPSB0aGlzLmdldE9udmlmUG9ydCgpO1xuXG4gICAgICAgICAgICB0aGlzLm9udmlmU2VydmVyID0gbmV3IE9udmlmU2VydmVyKHtcbiAgICAgICAgICAgICAgICBodHRwUG9ydDogb252aWZQb3J0LFxuICAgICAgICAgICAgICAgIHJ0c3BVcmw6IHRoaXMuZ2V0UnRzcFVybCgwKSxcbiAgICAgICAgICAgICAgICBkZXZpY2VOYW1lOiBgQW1jcmVzdCBBU0gyMSAoJHtob3N0fSlgLFxuICAgICAgICAgICAgICAgIG1hbnVmYWN0dXJlcjogJ0FtY3Jlc3QnLFxuICAgICAgICAgICAgICAgIG1vZGVsOiAnQVNIMjEnLFxuICAgICAgICAgICAgICAgIHNlcmlhbE51bWJlcjogaG9zdC5yZXBsYWNlKC9cXC4vZywgJycpLFxuICAgICAgICAgICAgICAgIGhhcmR3YXJlSWQ6ICdBU0gyMS1QVFonLFxuICAgICAgICAgICAgICAgIG1hY0FkZHJlc3M6ICcwMDowMDowMDowMDowMDowMCcsXG4gICAgICAgICAgICAgICAgaXBBZGRyZXNzOiBvbnZpZklwLFxuICAgICAgICAgICAgICAgIGNvbnNvbGU6IHRoaXMuY29uc29sZSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIFBUWiBjb21tYW5kcyBmcm9tIE9OVklGIGFuZCB0cmFuc2xhdGUgdG8gRFZSSVBcbiAgICAgICAgICAgIHRoaXMub252aWZTZXJ2ZXIub24oJ3B0eicsIGFzeW5jIChjb21tYW5kOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU9udmlmUHR6KGNvbW1hbmQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tPTlZJRl0gUFRaIGNvbW1hbmQgZXJyb3I6JywgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5vbnZpZlNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW09OVklGXSBTZXJ2ZXIgc3RhcnRlZCBhdCBodHRwOi8vJHtvbnZpZklwfToke29udmlmUG9ydH0vb252aWYvZGV2aWNlX3NlcnZpY2VgKTtcbiAgICAgICAgfSkoKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vbnZpZlNlcnZlclN0YXJ0aW5nO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5vbnZpZlNlcnZlclN0YXJ0aW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3RvcE9udmlmU2VydmVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5vbnZpZlNlcnZlcikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vbnZpZlNlcnZlci5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLm9udmlmU2VydmVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlT252aWZQdHooY29tbWFuZDogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGR2cmlwID0gYXdhaXQgdGhpcy5lbnN1cmVEdnJpcENvbm5lY3RlZCgpO1xuXG4gICAgICAgIGNvbnN0IGdldFNwZWVkID0gKHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpOiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IDApIHJldHVybiAwO1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWluKDgsIE1hdGgubWF4KDEsIE1hdGguY2VpbChNYXRoLmFicyh2YWx1ZSkgKiA4KSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChjb21tYW5kLnR5cGUgPT09ICdzdG9wJykge1xuICAgICAgICAgICAgLy8gU3RvcCBhbGwgbW92ZW1lbnRcbiAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woJ0xlZnQnLCAwLCAnc3RvcCcpLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woJ1VwJywgMCwgJ3N0b3AnKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKCdab29tSW4nLCAwLCAnc3RvcCcpLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhbiA9IGNvbW1hbmQucGFuIHx8IDA7XG4gICAgICAgIGNvbnN0IHRpbHQgPSBjb21tYW5kLnRpbHQgfHwgMDtcbiAgICAgICAgY29uc3Qgem9vbSA9IGNvbW1hbmQuem9vbSB8fCAwO1xuXG4gICAgICAgIGlmIChjb21tYW5kLnR5cGUgPT09ICdjb250aW51b3VzJykge1xuICAgICAgICAgICAgLy8gQ29udGludW91cyBtb3ZlIC0gc3RhcnQgbW92ZW1lbnQgaW4gZGlyZWN0aW9uXG4gICAgICAgICAgICBpZiAocGFuICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gcGFuID4gMCA/ICdSaWdodCcgOiAnTGVmdCc7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHBhbiksICdzdGFydCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRpbHQgIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aWx0ID4gMCA/ICdVcCcgOiAnRG93bic7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHRpbHQpLCAnc3RhcnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh6b29tICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gem9vbSA+IDAgPyAnWm9vbUluJyA6ICdab29tT3V0JztcbiAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgZ2V0U3BlZWQoem9vbSksICdzdGFydCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gJ3JlbGF0aXZlJykge1xuICAgICAgICAgICAgLy8gUmVsYXRpdmUgbW92ZSAtIG1vdmUgYnJpZWZseSB0aGVuIHN0b3BcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gMzAwOyAvLyBtc1xuXG4gICAgICAgICAgICBpZiAocGFuICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gcGFuID4gMCA/ICdSaWdodCcgOiAnTGVmdCc7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHBhbiksICdzdGFydCcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIDAsICdzdG9wJykuY2F0Y2goKCkgPT4ge30pLCBkdXJhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGlsdCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRpbHQgPiAwID8gJ1VwJyA6ICdEb3duJztcbiAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgZ2V0U3BlZWQodGlsdCksICdzdGFydCcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIDAsICdzdG9wJykuY2F0Y2goKCkgPT4ge30pLCBkdXJhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoem9vbSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHpvb20gPiAwID8gJ1pvb21JbicgOiAnWm9vbU91dCc7XG4gICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIGdldFNwZWVkKHpvb20pLCAnc3RhcnQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpLmNhdGNoKCgpID0+IHt9KSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRSdHNwVXJsKHN1YnR5cGU6IG51bWJlciA9IDApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRIb3N0KCk7XG4gICAgICAgIGNvbnN0IHVzZXJuYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuZ2V0VXNlcm5hbWUoKSk7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuZ2V0UGFzc3dvcmQoKSk7XG4gICAgICAgIGNvbnN0IHBvcnQgPSB0aGlzLmdldFJ0c3BQb3J0KCk7XG4gICAgICAgIHJldHVybiBgcnRzcDovLyR7dXNlcm5hbWV9OiR7cGFzc3dvcmR9QCR7aG9zdH06JHtwb3J0fS9jYW0vcmVhbG1vbml0b3I/Y2hhbm5lbD0xJnN1YnR5cGU9JHtzdWJ0eXBlfWA7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0U2V0dGluZ3MoKTogUHJvbWlzZTxTZXR0aW5nW10+IHtcbiAgICAgICAgY29uc3Qgb252aWZJcCA9IHRoaXMuZ2V0T252aWZJcCgpO1xuICAgICAgICBjb25zdCBvbnZpZlBvcnQgPSB0aGlzLmdldE9udmlmUG9ydCgpO1xuICAgICAgICBjb25zdCBvbnZpZlVybCA9IGBodHRwOi8vJHtvbnZpZklwfToke29udmlmUG9ydH0vb252aWYvZGV2aWNlX3NlcnZpY2VgO1xuXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdDYW1lcmEgSVAgQWRkcmVzcycsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuZ2V0SG9zdCgpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnMTkyLjE2OC4xLjEwMCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5nZXRVc2VybmFtZSgpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdwYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdQYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuZ2V0UGFzc3dvcmQoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdydHNwUG9ydCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdSVFNQIFBvcnQnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldFJ0c3BQb3J0KCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJzU1NCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ2R2cmlwUG9ydCcsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdEVlJJUCBQb3J0IChmb3IgUFRaKScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuZ2V0RHZyaXBQb3J0KCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJzM3Nzc3JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAnb252aWZFbmFibGVkJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0VuYWJsZSBPTlZJRiBTZXJ2ZXInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhwb3NlIHRoaXMgY2FtZXJhIGFzIGFuIE9OVklGIGRldmljZSB3aXRoIFBUWiBzdXBwb3J0JyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5pc09udmlmRW5hYmxlZCgpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAnb252aWZQb3J0JyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ09OVklGIFNlcnZlciBQb3J0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5pc09udmlmRW5hYmxlZCgpID8gYE9OVklGIFVSTDogJHtvbnZpZlVybH1gIDogJ0VuYWJsZSBPTlZJRiBzZXJ2ZXIgdG8gc2VlIFVSTCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG9udmlmUG9ydC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnODA4MCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleTogJ29udmlmSXAnLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnT05WSUYgU2VydmVyIElQJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0lQIGFkZHJlc3MgZm9yIE9OVklGIGRpc2NvdmVyeSAoYXV0by1kZXRlY3RlZCBpZiBlbXB0eSknLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLnN0b3JhZ2UuZ2V0SXRlbSgnb252aWZJcCcpIHx8ICcnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBvbnZpZklwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBwdXRTZXR0aW5nKGtleTogc3RyaW5nLCB2YWx1ZTogU2V0dGluZ1ZhbHVlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuc3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUgIT0gbnVsbCA/IFN0cmluZyh2YWx1ZSkgOiAnJyk7XG5cbiAgICAgICAgLy8gRGlzY29ubmVjdCBEVlJJUCBvbiBjb25uZWN0aW9uIHNldHRpbmdzIGNoYW5nZVxuICAgICAgICBpZiAoWydob3N0JywgJ3VzZXJuYW1lJywgJ3Bhc3N3b3JkJywgJ2R2cmlwUG9ydCddLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmR2cmlwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kdnJpcC5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kdnJpcCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgT05WSUYgc2VydmVyIGNoYW5nZXNcbiAgICAgICAgaWYgKGtleSA9PT0gJ29udmlmRW5hYmxlZCcpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdGFydE9udmlmU2VydmVyKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RvcE9udmlmU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoWydvbnZpZlBvcnQnLCAnb252aWZJcCcsICdob3N0J10uaW5jbHVkZXMoa2V5KSAmJiB0aGlzLmlzT252aWZFbmFibGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFJlc3RhcnQgT05WSUYgc2VydmVyIHdpdGggbmV3IHNldHRpbmdzXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN0b3BPbnZpZlNlcnZlcigpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdGFydE9udmlmU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVuc3VyZUR2cmlwQ29ubmVjdGVkKCk6IFByb21pc2U8RGFodWFEVlJJUD4ge1xuICAgICAgICBpZiAodGhpcy5kdnJpcD8uaXNDb25uZWN0ZWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZHZyaXA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5kdnJpcENvbm5lY3RpbmcpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZHZyaXBDb25uZWN0aW5nO1xuICAgICAgICAgICAgaWYgKHRoaXMuZHZyaXA/LmlzQ29ubmVjdGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kdnJpcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZHZyaXBDb25uZWN0aW5nID0gKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSB0aGlzLmdldEhvc3QoKTtcbiAgICAgICAgICAgIGlmICghaG9zdCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FtZXJhIElQIG5vdCBjb25maWd1cmVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZHZyaXAgPSBuZXcgRGFodWFEVlJJUCh7XG4gICAgICAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgICAgICBwb3J0OiB0aGlzLmdldER2cmlwUG9ydCgpLFxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiB0aGlzLmdldFVzZXJuYW1lKCksXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMuZ2V0UGFzc3dvcmQoKSxcbiAgICAgICAgICAgICAgICBjb25zb2xlOiB0aGlzLmNvbnNvbGUsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmR2cmlwLmNvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgdGhpcy5kdnJpcC5sb2dpbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHZyaXAuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZHZyaXAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHRoaXMuZHZyaXBDb25uZWN0aW5nO1xuICAgICAgICB0aGlzLmR2cmlwQ29ubmVjdGluZyA9IG51bGw7XG5cbiAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RWUklQIGxvZ2luIGZhaWxlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZHZyaXAhO1xuICAgIH1cblxuICAgIC8vIFZpZGVvQ2FtZXJhIGludGVyZmFjZVxuICAgIGFzeW5jIGdldFZpZGVvU3RyZWFtKG9wdGlvbnM/OiBNZWRpYVN0cmVhbU9wdGlvbnMpOiBQcm9taXNlPE1lZGlhT2JqZWN0PiB7XG4gICAgICAgIGNvbnN0IHN1YnR5cGUgPSBvcHRpb25zPy5pZCA9PT0gJ3N1YnN0cmVhbScgPyAxIDogMDtcbiAgICAgICAgY29uc3QgcnRzcFVybCA9IHRoaXMuZ2V0UnRzcFVybChzdWJ0eXBlKTtcblxuICAgICAgICBjb25zdCBmZm1wZWdJbnB1dDogRkZtcGVnSW5wdXQgPSB7XG4gICAgICAgICAgICB1cmw6IHJ0c3BVcmwsXG4gICAgICAgICAgICBpbnB1dEFyZ3VtZW50czogW1xuICAgICAgICAgICAgICAgICctcnRzcF90cmFuc3BvcnQnLCAndGNwJyxcbiAgICAgICAgICAgICAgICAnLWknLCBydHNwVXJsLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWVkaWFNYW5hZ2VyLmNyZWF0ZUZGbXBlZ01lZGlhT2JqZWN0KGZmbXBlZ0lucHV0KTtcbiAgICB9XG5cbiAgICBhc3luYyBnZXRWaWRlb1N0cmVhbU9wdGlvbnMoKTogUHJvbWlzZTxSZXNwb25zZU1lZGlhU3RyZWFtT3B0aW9uc1tdPiB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICdtYWluc3RyZWFtJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnTWFpbiBTdHJlYW0nLFxuICAgICAgICAgICAgICAgIHZpZGVvOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjOiAnaDI2NCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhdWRpbzoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlYzogJ2FhYycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICdzdWJzdHJlYW0nLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTdWIgU3RyZWFtJyxcbiAgICAgICAgICAgICAgICB2aWRlbzoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlYzogJ2gyNjQnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWM6ICdhYWMnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8vIENhbWVyYSBpbnRlcmZhY2VcbiAgICBhc3luYyB0YWtlUGljdHVyZShvcHRpb25zPzogYW55KTogUHJvbWlzZTxNZWRpYU9iamVjdD4ge1xuICAgICAgICAvLyBVc2UgRkZtcGVnIHRvIGdyYWIgYSBmcmFtZSBmcm9tIFJUU1BcbiAgICAgICAgY29uc3QgcnRzcFVybCA9IHRoaXMuZ2V0UnRzcFVybCgxKTsgIC8vIFVzZSBzdWJzdHJlYW0gZm9yIGZhc3RlciBzbmFwc2hvdFxuXG4gICAgICAgIGNvbnN0IGZmbXBlZ0lucHV0OiBGRm1wZWdJbnB1dCA9IHtcbiAgICAgICAgICAgIHVybDogcnRzcFVybCxcbiAgICAgICAgICAgIGlucHV0QXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgJy1ydHNwX3RyYW5zcG9ydCcsICd0Y3AnLFxuICAgICAgICAgICAgICAgICctaScsIHJ0c3BVcmwsXG4gICAgICAgICAgICAgICAgJy1mcmFtZXM6dicsICcxJyxcbiAgICAgICAgICAgICAgICAnLWYnLCAnaW1hZ2UyJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhTWFuYWdlci5jcmVhdGVGRm1wZWdNZWRpYU9iamVjdChmZm1wZWdJbnB1dCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0UGljdHVyZU9wdGlvbnMoKTogUHJvbWlzZTxSZXNwb25zZVBpY3R1cmVPcHRpb25zW10+IHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIENsZWFudXAgd2hlbiBkZXZpY2UgaXMgcmVsZWFzZWRcbiAgICBhc3luYyByZWxlYXNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3BPbnZpZlNlcnZlcigpO1xuICAgICAgICBpZiAodGhpcy5kdnJpcCkge1xuICAgICAgICAgICAgdGhpcy5kdnJpcC5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLmR2cmlwID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBhblRpbHRab29tIGludGVyZmFjZVxuICAgIGFzeW5jIHB0ekNvbW1hbmQoY29tbWFuZDogUGFuVGlsdFpvb21Db21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGR2cmlwID0gYXdhaXQgdGhpcy5lbnN1cmVEdnJpcENvbm5lY3RlZCgpO1xuXG4gICAgICAgIC8vIE1hcCBub3JtYWxpemVkIHZhbHVlcyAoLTEgdG8gMSkgdG8gRFZSSVAgY29tbWFuZHNcbiAgICAgICAgLy8gU3BlZWQgaXMgZGVyaXZlZCBmcm9tIG1hZ25pdHVkZVxuICAgICAgICBjb25zdCBnZXRTcGVlZCA9ICh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gMDtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBNYXRoLmNlaWwoTWF0aC5hYnModmFsdWUpICogOCkpKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwYW4gPSBjb21tYW5kLnBhbjtcbiAgICAgICAgY29uc3QgdGlsdCA9IGNvbW1hbmQudGlsdDtcbiAgICAgICAgY29uc3Qgem9vbSA9IGNvbW1hbmQuem9vbTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHBhblxuICAgICAgICAgICAgaWYgKHBhbiAhPT0gdW5kZWZpbmVkICYmIHBhbiAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHBhbiA+IDAgPyAnUmlnaHQnIDogJ0xlZnQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gZ2V0U3BlZWQocGFuKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgc3BlZWQsICdzdGFydCcpO1xuICAgICAgICAgICAgICAgIC8vIFN0b3AgYWZ0ZXIgYnJpZWYgbW92ZW1lbnQgZm9yIHJlbGF0aXZlIGNvbnRyb2xcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGR2cmlwLnB0ekNvbnRyb2woZGlyZWN0aW9uLCAwLCAnc3RvcCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgc3RvcCBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aWx0XG4gICAgICAgICAgICBpZiAodGlsdCAhPT0gdW5kZWZpbmVkICYmIHRpbHQgIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aWx0ID4gMCA/ICdVcCcgOiAnRG93bic7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3BlZWQgPSBnZXRTcGVlZCh0aWx0KTtcbiAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgc3BlZWQsICdzdGFydCcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIDAsICdzdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBzdG9wIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIHpvb21cbiAgICAgICAgICAgIGlmICh6b29tICE9PSB1bmRlZmluZWQgJiYgem9vbSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHpvb20gPiAwID8gJ1pvb21JbicgOiAnWm9vbU91dCc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3BlZWQgPSBnZXRTcGVlZCh6b29tKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBkdnJpcC5wdHpDb250cm9sKGRpcmVjdGlvbiwgc3BlZWQsICdzdGFydCcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZHZyaXAucHR6Q29udHJvbChkaXJlY3Rpb24sIDAsICdzdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBzdG9wIGVycm9yc1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1BUWiBjb21tYW5kIGVycm9yOicsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBBbWNyZXN0QVNIMjFQcm92aWRlciBleHRlbmRzIFNjcnlwdGVkRGV2aWNlQmFzZSBpbXBsZW1lbnRzIERldmljZVByb3ZpZGVyLCBTZXR0aW5ncyB7XG4gICAgcHJpdmF0ZSBjYW1lcmFzOiBNYXA8c3RyaW5nLCBBbWNyZXN0QVNIMjFDYW1lcmE+ID0gbmV3IE1hcCgpO1xuXG4gICAgY29uc3RydWN0b3IobmF0aXZlSWQ/OiBzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIobmF0aXZlSWQpO1xuICAgIH1cblxuICAgIGFzeW5jIGdldFNldHRpbmdzKCk6IFByb21pc2U8U2V0dGluZ1tdPiB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5OiAnYWRkQ2FtZXJhJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0FkZCBDYW1lcmEnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRW50ZXIgdGhlIGNhbWVyYSBJUCBhZGRyZXNzIHRvIGFkZCBhIG5ldyBBbWNyZXN0IEFTSDIxIGNhbWVyYScsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICcxOTIuMTY4LjEuMTAwJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgcHV0U2V0dGluZyhrZXk6IHN0cmluZywgdmFsdWU6IFNldHRpbmdWYWx1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoa2V5ID09PSAnYWRkQ2FtZXJhJyAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgaXAgPSBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hZGRDYW1lcmEoaXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDYW1lcmEoaXA6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBuYXRpdmVJZCA9IGBhbWNyZXN0LWFzaDIxLSR7aXAucmVwbGFjZSgvXFwuL2csICctJyl9YDtcblxuICAgICAgICBhd2FpdCBkZXZpY2VNYW5hZ2VyLm9uRGV2aWNlRGlzY292ZXJlZCh7XG4gICAgICAgICAgICBuYXRpdmVJZCxcbiAgICAgICAgICAgIG5hbWU6IGBBbWNyZXN0IEFTSDIxICgke2lwfSlgLFxuICAgICAgICAgICAgdHlwZTogU2NyeXB0ZWREZXZpY2VUeXBlLkNhbWVyYSxcbiAgICAgICAgICAgIGludGVyZmFjZXM6IFtcbiAgICAgICAgICAgICAgICBTY3J5cHRlZEludGVyZmFjZS5DYW1lcmEsXG4gICAgICAgICAgICAgICAgU2NyeXB0ZWRJbnRlcmZhY2UuVmlkZW9DYW1lcmEsXG4gICAgICAgICAgICAgICAgU2NyeXB0ZWRJbnRlcmZhY2UuUGFuVGlsdFpvb20sXG4gICAgICAgICAgICAgICAgU2NyeXB0ZWRJbnRlcmZhY2UuU2V0dGluZ3MsXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBob3N0IGFmdGVyIGRldmljZSBpcyBjcmVhdGVkXG4gICAgICAgIGNvbnN0IGRldmljZSA9IGF3YWl0IHRoaXMuZ2V0RGV2aWNlKG5hdGl2ZUlkKTtcbiAgICAgICAgaWYgKGRldmljZSAmJiBkZXZpY2Uuc3RvcmFnZSkge1xuICAgICAgICAgICAgZGV2aWNlLnN0b3JhZ2Uuc2V0SXRlbSgnaG9zdCcsIGlwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGdldERldmljZShuYXRpdmVJZDogc3RyaW5nKTogUHJvbWlzZTxBbWNyZXN0QVNIMjFDYW1lcmE+IHtcbiAgICAgICAgbGV0IGNhbWVyYSA9IHRoaXMuY2FtZXJhcy5nZXQobmF0aXZlSWQpO1xuICAgICAgICBpZiAoIWNhbWVyYSkge1xuICAgICAgICAgICAgY2FtZXJhID0gbmV3IEFtY3Jlc3RBU0gyMUNhbWVyYShuYXRpdmVJZCk7XG4gICAgICAgICAgICB0aGlzLmNhbWVyYXMuc2V0KG5hdGl2ZUlkLCBjYW1lcmEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYW1lcmE7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVsZWFzZURldmljZShpZDogc3RyaW5nLCBuYXRpdmVJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGNhbWVyYSA9IHRoaXMuY2FtZXJhcy5nZXQobmF0aXZlSWQpO1xuICAgICAgICBpZiAoY2FtZXJhKSB7XG4gICAgICAgICAgICBhd2FpdCBjYW1lcmEucmVsZWFzZSgpO1xuICAgICAgICAgICAgdGhpcy5jYW1lcmFzLmRlbGV0ZShuYXRpdmVJZCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBBbWNyZXN0QVNIMjFQcm92aWRlcigpO1xuIl19

/***/ },

/***/ "./src/onvif-server.ts"
/*!*****************************!*\
  !*** ./src/onvif-server.ts ***!
  \*****************************/
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OnvifServer = void 0;
const http = __importStar(__webpack_require__(/*! http */ "http"));
const dgram = __importStar(__webpack_require__(/*! dgram */ "dgram"));
const events_1 = __webpack_require__(/*! events */ "events");
class OnvifServer extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.httpServer = null;
        this.discoverySocket = null;
        this.running = false;
        // ONVIF namespaces
        this.NS = {
            soap: 'http://www.w3.org/2003/05/soap-envelope',
            wsa: 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
            wsd: 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
            tds: 'http://www.onvif.org/ver10/device/wsdl',
            trt: 'http://www.onvif.org/ver10/media/wsdl',
            tptz: 'http://www.onvif.org/ver20/ptz/wsdl',
            tt: 'http://www.onvif.org/ver10/schema',
        };
        this.config = config;
        this.console = config.console || console;
    }
    async start() {
        if (this.running)
            return;
        // Start HTTP server for SOAP requests
        await this.startHttpServer();
        // Start WS-Discovery listener
        await this.startDiscovery();
        this.running = true;
        this.console.log(`[ONVIF Server] Started on port ${this.config.httpPort}`);
    }
    async stop() {
        this.running = false;
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        if (this.discoverySocket) {
            this.discoverySocket.close();
            this.discoverySocket = null;
        }
        this.console.log('[ONVIF Server] Stopped');
    }
    async startHttpServer() {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer((req, res) => {
                this.handleHttpRequest(req, res);
            });
            this.httpServer.on('error', (err) => {
                this.console.error('[ONVIF Server] HTTP error:', err.message);
                reject(err);
            });
            this.httpServer.listen(this.config.httpPort, '0.0.0.0', () => {
                resolve();
            });
        });
    }
    async handleHttpRequest(req, res) {
        this.console.log(`[ONVIF Server] HTTP ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                this.console.log(`[ONVIF Server] Request body length: ${body.length}`);
                const response = await this.handleSoapRequest(req.url || '/', body);
                res.writeHead(200, {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(response),
                });
                res.end(response);
            }
            catch (err) {
                this.console.error('[ONVIF Server] Request error:', err.message);
                const fault = this.createSoapFault('Server', err.message);
                res.writeHead(500, {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                });
                res.end(fault);
            }
        });
    }
    async handleSoapRequest(path, body) {
        // Extract action from SOAP body
        const action = this.extractSoapAction(body);
        this.console.log(`[ONVIF Server] Request: ${path} Action: ${action}`);
        // Route to appropriate handler
        if (action.includes('GetSystemDateAndTime')) {
            return this.handleGetSystemDateAndTime();
        }
        else if (action.includes('GetCapabilities')) {
            return this.handleGetCapabilities();
        }
        else if (action.includes('GetServices')) {
            return this.handleGetServices();
        }
        else if (action.includes('GetDeviceInformation')) {
            return this.handleGetDeviceInformation();
        }
        else if (action.includes('GetProfiles')) {
            return this.handleGetProfiles();
        }
        else if (action.includes('GetStreamUri')) {
            return this.handleGetStreamUri(body);
        }
        else if (action.includes('GetSnapshotUri')) {
            return this.handleGetSnapshotUri();
        }
        else if (action.includes('GetNodes') || action.includes('GetNode')) {
            return this.handleGetNodes();
        }
        else if (action.includes('GetConfigurations') && action.includes('PTZ')) {
            return this.handleGetPTZConfigurations();
        }
        else if (action.includes('GetConfiguration') && action.includes('PTZ')) {
            return this.handleGetPTZConfiguration();
        }
        else if (action.includes('GetStatus')) {
            return this.handleGetPTZStatus();
        }
        else if (action.includes('ContinuousMove')) {
            return this.handleContinuousMove(body);
        }
        else if (action.includes('RelativeMove')) {
            return this.handleRelativeMove(body);
        }
        else if (action.includes('AbsoluteMove')) {
            return this.handleAbsoluteMove(body);
        }
        else if (action.includes('Stop')) {
            return this.handlePTZStop();
        }
        else if (action.includes('GetPresets')) {
            return this.handleGetPresets();
        }
        else if (action.includes('GotoPreset')) {
            return this.handleGotoPreset(body);
        }
        else if (action.includes('SetPreset')) {
            return this.handleSetPreset(body);
        }
        else if (action.includes('RemovePreset')) {
            return this.handleRemovePreset(body);
        }
        else if (action.includes('GotoHomePosition')) {
            return this.handleGotoHomePosition();
        }
        else if (action.includes('SetHomePosition')) {
            return this.handleSetHomePosition();
        }
        else if (action.includes('GetScopes')) {
            return this.handleGetScopes();
        }
        else if (action.includes('GetServiceCapabilities')) {
            return this.handleGetServiceCapabilities(path);
        }
        else if (action.includes('GetVideoSources')) {
            return this.handleGetVideoSources();
        }
        else if (action.includes('GetNetworkInterfaces')) {
            return this.handleGetNetworkInterfaces();
        }
        else {
            this.console.log(`[ONVIF Server] Unhandled action: ${action}`);
            return this.handleGetCapabilities(); // Default response
        }
    }
    extractSoapAction(body) {
        // Try to extract from Body element
        const bodyMatch = body.match(/<[^:]*:?Body[^>]*>([\s\S]*?)<\/[^:]*:?Body>/i);
        if (bodyMatch) {
            const innerContent = bodyMatch[1];
            const actionMatch = innerContent.match(/<([^\s>\/]+)/);
            if (actionMatch) {
                return actionMatch[1].replace(/^[^:]+:/, '');
            }
        }
        return 'Unknown';
    }
    // Device Service handlers
    handleGetSystemDateAndTime() {
        const now = new Date();
        return this.wrapSoapResponse(`
            <tds:GetSystemDateAndTimeResponse>
                <tds:SystemDateAndTime>
                    <tt:DateTimeType>NTP</tt:DateTimeType>
                    <tt:DaylightSavings>false</tt:DaylightSavings>
                    <tt:TimeZone>
                        <tt:TZ>UTC0</tt:TZ>
                    </tt:TimeZone>
                    <tt:UTCDateTime>
                        <tt:Time>
                            <tt:Hour>${now.getUTCHours()}</tt:Hour>
                            <tt:Minute>${now.getUTCMinutes()}</tt:Minute>
                            <tt:Second>${now.getUTCSeconds()}</tt:Second>
                        </tt:Time>
                        <tt:Date>
                            <tt:Year>${now.getUTCFullYear()}</tt:Year>
                            <tt:Month>${now.getUTCMonth() + 1}</tt:Month>
                            <tt:Day>${now.getUTCDate()}</tt:Day>
                        </tt:Date>
                    </tt:UTCDateTime>
                </tds:SystemDateAndTime>
            </tds:GetSystemDateAndTimeResponse>
        `);
    }
    handleGetCapabilities() {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        return this.wrapSoapResponse(`
            <tds:GetCapabilitiesResponse>
                <tds:Capabilities>
                    <tt:Device>
                        <tt:XAddr>${baseUrl}/onvif/device_service</tt:XAddr>
                        <tt:Network>
                            <tt:IPFilter>false</tt:IPFilter>
                            <tt:ZeroConfiguration>false</tt:ZeroConfiguration>
                            <tt:IPVersion6>false</tt:IPVersion6>
                            <tt:DynDNS>false</tt:DynDNS>
                        </tt:Network>
                        <tt:System>
                            <tt:DiscoveryResolve>false</tt:DiscoveryResolve>
                            <tt:DiscoveryBye>true</tt:DiscoveryBye>
                            <tt:RemoteDiscovery>false</tt:RemoteDiscovery>
                            <tt:SystemBackup>false</tt:SystemBackup>
                            <tt:SystemLogging>false</tt:SystemLogging>
                            <tt:FirmwareUpgrade>false</tt:FirmwareUpgrade>
                        </tt:System>
                    </tt:Device>
                    <tt:Media>
                        <tt:XAddr>${baseUrl}/onvif/media_service</tt:XAddr>
                        <tt:StreamingCapabilities>
                            <tt:RTPMulticast>false</tt:RTPMulticast>
                            <tt:RTP_TCP>true</tt:RTP_TCP>
                            <tt:RTP_RTSP_TCP>true</tt:RTP_RTSP_TCP>
                        </tt:StreamingCapabilities>
                    </tt:Media>
                    <tt:PTZ>
                        <tt:XAddr>${baseUrl}/onvif/ptz_service</tt:XAddr>
                    </tt:PTZ>
                </tds:Capabilities>
            </tds:GetCapabilitiesResponse>
        `);
    }
    handleGetServices() {
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        return this.wrapSoapResponse(`
            <tds:GetServicesResponse>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/device_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/media_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
                <tds:Service>
                    <tds:Namespace>http://www.onvif.org/ver20/ptz/wsdl</tds:Namespace>
                    <tds:XAddr>${baseUrl}/onvif/ptz_service</tds:XAddr>
                    <tds:Version>
                        <tt:Major>2</tt:Major>
                        <tt:Minor>0</tt:Minor>
                    </tds:Version>
                </tds:Service>
            </tds:GetServicesResponse>
        `);
    }
    handleGetDeviceInformation() {
        return this.wrapSoapResponse(`
            <tds:GetDeviceInformationResponse>
                <tds:Manufacturer>${this.config.manufacturer}</tds:Manufacturer>
                <tds:Model>${this.config.model}</tds:Model>
                <tds:FirmwareVersion>1.0.0</tds:FirmwareVersion>
                <tds:SerialNumber>${this.config.serialNumber}</tds:SerialNumber>
                <tds:HardwareId>${this.config.hardwareId}</tds:HardwareId>
            </tds:GetDeviceInformationResponse>
        `);
    }
    handleGetScopes() {
        return this.wrapSoapResponse(`
            <tds:GetScopesResponse>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/type/video_encoder</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/type/ptz</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/Profile/Streaming</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/name/${encodeURIComponent(this.config.deviceName)}</tt:ScopeItem>
                </tds:Scopes>
                <tds:Scopes>
                    <tt:ScopeDef>Fixed</tt:ScopeDef>
                    <tt:ScopeItem>onvif://www.onvif.org/hardware/${encodeURIComponent(this.config.model)}</tt:ScopeItem>
                </tds:Scopes>
            </tds:GetScopesResponse>
        `);
    }
    handleGetServiceCapabilities(path) {
        if (path.includes('ptz')) {
            return this.wrapSoapResponse(`
                <tptz:GetServiceCapabilitiesResponse>
                    <tptz:Capabilities EFlip="false" Reverse="false" GetCompatibleConfigurations="false" MoveStatus="true" StatusPosition="true"/>
                </tptz:GetServiceCapabilitiesResponse>
            `);
        }
        return this.wrapSoapResponse(`
            <tds:GetServiceCapabilitiesResponse>
                <tds:Capabilities/>
            </tds:GetServiceCapabilitiesResponse>
        `);
    }
    handleGetNetworkInterfaces() {
        return this.wrapSoapResponse(`
            <tds:GetNetworkInterfacesResponse>
                <tds:NetworkInterfaces token="eth0">
                    <tt:Enabled>true</tt:Enabled>
                    <tt:Info>
                        <tt:Name>eth0</tt:Name>
                        <tt:HwAddress>${this.config.macAddress}</tt:HwAddress>
                    </tt:Info>
                    <tt:IPv4>
                        <tt:Enabled>true</tt:Enabled>
                        <tt:Config>
                            <tt:Manual>
                                <tt:Address>${this.config.ipAddress}</tt:Address>
                                <tt:PrefixLength>24</tt:PrefixLength>
                            </tt:Manual>
                            <tt:DHCP>false</tt:DHCP>
                        </tt:Config>
                    </tt:IPv4>
                </tds:NetworkInterfaces>
            </tds:GetNetworkInterfacesResponse>
        `);
    }
    // Media Service handlers
    handleGetProfiles() {
        return this.wrapSoapResponse(`
            <trt:GetProfilesResponse>
                <trt:Profiles token="MainProfile" fixed="true">
                    <tt:Name>MainStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="1920" height="1080"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder1">
                        <tt:Name>VideoEncoder1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution>
                            <tt:Width>1920</tt:Width>
                            <tt:Height>1080</tt:Height>
                        </tt:Resolution>
                        <tt:Quality>5</tt:Quality>
                        <tt:RateControl>
                            <tt:FrameRateLimit>30</tt:FrameRateLimit>
                            <tt:EncodingInterval>1</tt:EncodingInterval>
                            <tt:BitrateLimit>4096</tt:BitrateLimit>
                        </tt:RateControl>
                        <tt:H264>
                            <tt:GovLength>30</tt:GovLength>
                            <tt:H264Profile>High</tt:H264Profile>
                        </tt:H264>
                        <tt:Multicast>
                            <tt:Address>
                                <tt:Type>IPv4</tt:Type>
                                <tt:IPv4Address>0.0.0.0</tt:IPv4Address>
                            </tt:Address>
                            <tt:Port>0</tt:Port>
                            <tt:TTL>0</tt:TTL>
                            <tt:AutoStart>false</tt:AutoStart>
                        </tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:NodeToken>PTZNode1</tt:NodeToken>
                        <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                        <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                        <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                        <tt:PanTiltLimits>
                            <tt:Range>
                                <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace</tt:URI>
                                <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                                <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                            </tt:Range>
                        </tt:PanTiltLimits>
                        <tt:ZoomLimits>
                            <tt:Range>
                                <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace</tt:URI>
                                <tt:XRange><tt:Min>0</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            </tt:Range>
                        </tt:ZoomLimits>
                    </tt:PTZConfiguration>
                </trt:Profiles>
                <trt:Profiles token="SubProfile" fixed="true">
                    <tt:Name>SubStream</tt:Name>
                    <tt:VideoSourceConfiguration token="VideoSource1">
                        <tt:Name>VideoSource1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:SourceToken>VideoSource1</tt:SourceToken>
                        <tt:Bounds x="0" y="0" width="640" height="480"/>
                    </tt:VideoSourceConfiguration>
                    <tt:VideoEncoderConfiguration token="VideoEncoder2">
                        <tt:Name>VideoEncoder2</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:Encoding>H264</tt:Encoding>
                        <tt:Resolution>
                            <tt:Width>640</tt:Width>
                            <tt:Height>480</tt:Height>
                        </tt:Resolution>
                        <tt:Quality>3</tt:Quality>
                        <tt:RateControl>
                            <tt:FrameRateLimit>15</tt:FrameRateLimit>
                            <tt:EncodingInterval>1</tt:EncodingInterval>
                            <tt:BitrateLimit>512</tt:BitrateLimit>
                        </tt:RateControl>
                        <tt:H264>
                            <tt:GovLength>30</tt:GovLength>
                            <tt:H264Profile>Main</tt:H264Profile>
                        </tt:H264>
                        <tt:Multicast>
                            <tt:Address>
                                <tt:Type>IPv4</tt:Type>
                                <tt:IPv4Address>0.0.0.0</tt:IPv4Address>
                            </tt:Address>
                            <tt:Port>0</tt:Port>
                            <tt:TTL>0</tt:TTL>
                            <tt:AutoStart>false</tt:AutoStart>
                        </tt:Multicast>
                        <tt:SessionTimeout>PT60S</tt:SessionTimeout>
                    </tt:VideoEncoderConfiguration>
                    <tt:PTZConfiguration token="PTZ1">
                        <tt:Name>PTZ1</tt:Name>
                        <tt:UseCount>1</tt:UseCount>
                        <tt:NodeToken>PTZNode1</tt:NodeToken>
                    </tt:PTZConfiguration>
                </trt:Profiles>
            </trt:GetProfilesResponse>
        `);
    }
    handleGetStreamUri(body) {
        // Check which profile is requested
        const isSubstream = body.includes('SubProfile');
        const rtspUrl = this.config.rtspUrl.replace('subtype=0', isSubstream ? 'subtype=1' : 'subtype=0');
        return this.wrapSoapResponse(`
            <trt:GetStreamUriResponse>
                <trt:MediaUri>
                    <tt:Uri>${rtspUrl}</tt:Uri>
                    <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
                    <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
                    <tt:Timeout>PT60S</tt:Timeout>
                </trt:MediaUri>
            </trt:GetStreamUriResponse>
        `);
    }
    handleGetSnapshotUri() {
        return this.wrapSoapResponse(`
            <trt:GetSnapshotUriResponse>
                <trt:MediaUri>
                    <tt:Uri>${this.config.rtspUrl}</tt:Uri>
                    <tt:InvalidAfterConnect>false</tt:InvalidAfterConnect>
                    <tt:InvalidAfterReboot>false</tt:InvalidAfterReboot>
                    <tt:Timeout>PT60S</tt:Timeout>
                </trt:MediaUri>
            </trt:GetSnapshotUriResponse>
        `);
    }
    handleGetVideoSources() {
        return this.wrapSoapResponse(`
            <trt:GetVideoSourcesResponse>
                <trt:VideoSources token="VideoSource1">
                    <tt:Framerate>30</tt:Framerate>
                    <tt:Resolution>
                        <tt:Width>1920</tt:Width>
                        <tt:Height>1080</tt:Height>
                    </tt:Resolution>
                </trt:VideoSources>
            </trt:GetVideoSourcesResponse>
        `);
    }
    // PTZ Service handlers
    handleGetNodes() {
        return this.wrapSoapResponse(`
            <tptz:GetNodesResponse>
                <tptz:PTZNode token="PTZNode1" FixedHomePosition="false">
                    <tt:Name>PTZ Node</tt:Name>
                    <tt:SupportedPTZSpaces>
                        <tt:ContinuousPanTiltVelocitySpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                        </tt:ContinuousPanTiltVelocitySpace>
                        <tt:ContinuousZoomVelocitySpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                        </tt:ContinuousZoomVelocitySpace>
                        <tt:RelativePanTiltTranslationSpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/PanTiltSpaces/TranslationGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                            <tt:YRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:YRange>
                        </tt:RelativePanTiltTranslationSpace>
                        <tt:RelativeZoomTranslationSpace>
                            <tt:URI>http://www.onvif.org/ver10/tptz/ZoomSpaces/TranslationGenericSpace</tt:URI>
                            <tt:XRange><tt:Min>-1</tt:Min><tt:Max>1</tt:Max></tt:XRange>
                        </tt:RelativeZoomTranslationSpace>
                    </tt:SupportedPTZSpaces>
                    <tt:MaximumNumberOfPresets>16</tt:MaximumNumberOfPresets>
                    <tt:HomeSupported>false</tt:HomeSupported>
                </tptz:PTZNode>
            </tptz:GetNodesResponse>
        `);
    }
    handleGetPTZConfigurations() {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationsResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name>
                    <tt:UseCount>2</tt:UseCount>
                    <tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationsResponse>
        `);
    }
    handleGetPTZConfiguration() {
        return this.wrapSoapResponse(`
            <tptz:GetConfigurationResponse>
                <tptz:PTZConfiguration token="PTZ1">
                    <tt:Name>PTZ Configuration</tt:Name>
                    <tt:UseCount>2</tt:UseCount>
                    <tt:NodeToken>PTZNode1</tt:NodeToken>
                    <tt:DefaultContinuousPanTiltVelocitySpace>http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace</tt:DefaultContinuousPanTiltVelocitySpace>
                    <tt:DefaultContinuousZoomVelocitySpace>http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace</tt:DefaultContinuousZoomVelocitySpace>
                    <tt:DefaultPTZTimeout>PT10S</tt:DefaultPTZTimeout>
                </tptz:PTZConfiguration>
            </tptz:GetConfigurationResponse>
        `);
    }
    handleGetPTZStatus() {
        return this.wrapSoapResponse(`
            <tptz:GetStatusResponse>
                <tptz:PTZStatus>
                    <tt:Position>
                        <tt:PanTilt x="0" y="0" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/PositionGenericSpace"/>
                        <tt:Zoom x="0" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/PositionGenericSpace"/>
                    </tt:Position>
                    <tt:MoveStatus>
                        <tt:PanTilt>IDLE</tt:PanTilt>
                        <tt:Zoom>IDLE</tt:Zoom>
                    </tt:MoveStatus>
                    <tt:UtcTime>${new Date().toISOString()}</tt:UtcTime>
                </tptz:PTZStatus>
            </tptz:GetStatusResponse>
        `);
    }
    handleContinuousMove(body) {
        const ptz = this.extractPTZVelocity(body);
        this.console.log(`[ONVIF Server] ContinuousMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'continuous', ...ptz });
        return this.wrapSoapResponse(`<tptz:ContinuousMoveResponse/>`);
    }
    handleRelativeMove(body) {
        const ptz = this.extractPTZTranslation(body);
        this.console.log(`[ONVIF Server] RelativeMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'relative', ...ptz });
        return this.wrapSoapResponse(`<tptz:RelativeMoveResponse/>`);
    }
    handleAbsoluteMove(body) {
        const ptz = this.extractPTZPosition(body);
        this.console.log(`[ONVIF Server] AbsoluteMove: pan=${ptz.pan}, tilt=${ptz.tilt}, zoom=${ptz.zoom}`);
        this.emit('ptz', { type: 'absolute', ...ptz });
        return this.wrapSoapResponse(`<tptz:AbsoluteMoveResponse/>`);
    }
    handlePTZStop() {
        this.console.log('[ONVIF Server] PTZ Stop');
        this.emit('ptz', { type: 'stop' });
        return this.wrapSoapResponse(`<tptz:StopResponse/>`);
    }
    handleGetPresets() {
        this.console.log('[ONVIF Server] GetPresets');
        // Return empty preset list - the camera doesn't support presets via DVRIP
        // but we need to return a valid response for Frigate
        return this.wrapSoapResponse(`
            <tptz:GetPresetsResponse>
            </tptz:GetPresetsResponse>
        `);
    }
    handleGotoPreset(body) {
        const presetMatch = body.match(/PresetToken[^>]*>([^<]*)</i);
        const presetToken = presetMatch ? presetMatch[1] : 'unknown';
        this.console.log(`[ONVIF Server] GotoPreset: ${presetToken}`);
        this.emit('ptz', { type: 'preset', preset: presetToken });
        return this.wrapSoapResponse(`<tptz:GotoPresetResponse/>`);
    }
    handleSetPreset(body) {
        const nameMatch = body.match(/PresetName[^>]*>([^<]*)</i);
        const presetName = nameMatch ? nameMatch[1] : 'Preset';
        this.console.log(`[ONVIF Server] SetPreset: ${presetName}`);
        // Return a fake token since we don't actually store presets
        return this.wrapSoapResponse(`
            <tptz:SetPresetResponse>
                <tptz:PresetToken>preset_1</tptz:PresetToken>
            </tptz:SetPresetResponse>
        `);
    }
    handleRemovePreset(body) {
        const presetMatch = body.match(/PresetToken[^>]*>([^<]*)</i);
        const presetToken = presetMatch ? presetMatch[1] : 'unknown';
        this.console.log(`[ONVIF Server] RemovePreset: ${presetToken}`);
        return this.wrapSoapResponse(`<tptz:RemovePresetResponse/>`);
    }
    handleGotoHomePosition() {
        this.console.log('[ONVIF Server] GotoHomePosition');
        this.emit('ptz', { type: 'home' });
        return this.wrapSoapResponse(`<tptz:GotoHomePositionResponse/>`);
    }
    handleSetHomePosition() {
        this.console.log('[ONVIF Server] SetHomePosition');
        return this.wrapSoapResponse(`<tptz:SetHomePositionResponse/>`);
    }
    // Helper methods for extracting PTZ values from SOAP requests
    extractPTZVelocity(body) {
        const result = {};
        // Extract PanTilt velocity
        const panTiltMatch = body.match(/PanTilt[^>]*x="([^"]*)"[^>]*y="([^"]*)"/i);
        if (panTiltMatch) {
            result.pan = parseFloat(panTiltMatch[1]) || 0;
            result.tilt = parseFloat(panTiltMatch[2]) || 0;
        }
        // Extract Zoom velocity
        const zoomMatch = body.match(/Zoom[^>]*x="([^"]*)"/i);
        if (zoomMatch) {
            result.zoom = parseFloat(zoomMatch[1]) || 0;
        }
        return result;
    }
    extractPTZTranslation(body) {
        return this.extractPTZVelocity(body); // Same format
    }
    extractPTZPosition(body) {
        return this.extractPTZVelocity(body); // Same format
    }
    // WS-Discovery
    async startDiscovery() {
        return new Promise((resolve) => {
            this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.discoverySocket.on('error', (err) => {
                this.console.error('[ONVIF Server] Discovery error:', err.message);
            });
            this.discoverySocket.on('message', (msg, rinfo) => {
                const message = msg.toString();
                if (message.includes('Probe') && message.includes('NetworkVideoTransmitter')) {
                    this.console.log(`[ONVIF Server] Discovery probe from ${rinfo.address}:${rinfo.port}`);
                    this.sendProbeMatch(rinfo.address, rinfo.port);
                }
            });
            this.discoverySocket.bind(3702, '0.0.0.0', () => {
                this.discoverySocket.addMembership('239.255.255.250');
                this.console.log('[ONVIF Server] WS-Discovery listening on 239.255.255.250:3702');
                resolve();
            });
        });
    }
    sendProbeMatch(address, port) {
        const messageId = `urn:uuid:${this.generateUUID()}`;
        const baseUrl = `http://${this.config.ipAddress}:${this.config.httpPort}`;
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
               xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery"
               xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
    <soap:Header>
        <wsa:MessageID>${messageId}</wsa:MessageID>
        <wsa:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:To>
        <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/ProbeMatches</wsa:Action>
    </soap:Header>
    <soap:Body>
        <wsd:ProbeMatches>
            <wsd:ProbeMatch>
                <wsa:EndpointReference>
                    <wsa:Address>urn:uuid:${this.config.serialNumber}</wsa:Address>
                </wsa:EndpointReference>
                <wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>
                <wsd:Scopes>
                    onvif://www.onvif.org/type/video_encoder
                    onvif://www.onvif.org/type/ptz
                    onvif://www.onvif.org/Profile/Streaming
                    onvif://www.onvif.org/name/${encodeURIComponent(this.config.deviceName)}
                    onvif://www.onvif.org/hardware/${encodeURIComponent(this.config.model)}
                </wsd:Scopes>
                <wsd:XAddrs>${baseUrl}/onvif/device_service</wsd:XAddrs>
                <wsd:MetadataVersion>1</wsd:MetadataVersion>
            </wsd:ProbeMatch>
        </wsd:ProbeMatches>
    </soap:Body>
</soap:Envelope>`;
        const buffer = Buffer.from(response);
        this.discoverySocket?.send(buffer, 0, buffer.length, port, address, (err) => {
            if (err) {
                this.console.error('[ONVIF Server] Failed to send probe match:', err.message);
            }
            else {
                this.console.log(`[ONVIF Server] Sent probe match to ${address}:${port}`);
            }
        });
    }
    // Utility methods
    wrapSoapResponse(content) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
               xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
    <soap:Body>
        ${content.trim()}
    </soap:Body>
</soap:Envelope>`;
    }
    createSoapFault(code, message) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <soap:Fault>
            <soap:Code>
                <soap:Value>soap:${code}</soap:Value>
            </soap:Code>
            <soap:Reason>
                <soap:Text xml:lang="en">${message}</soap:Text>
            </soap:Reason>
        </soap:Fault>
    </soap:Body>
</soap:Envelope>`;
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.OnvifServer = OnvifServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib252aWYtc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL29udmlmLXNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLG1DQUFzQztBQXFCdEMsTUFBYSxXQUFZLFNBQVEscUJBQVk7SUFrQnpDLFlBQVksTUFBeUI7UUFDakMsS0FBSyxFQUFFLENBQUM7UUFqQkosZUFBVSxHQUF1QixJQUFJLENBQUM7UUFDdEMsb0JBQWUsR0FBd0IsSUFBSSxDQUFDO1FBRTVDLFlBQU8sR0FBWSxLQUFLLENBQUM7UUFFakMsbUJBQW1CO1FBQ0YsT0FBRSxHQUFHO1lBQ2xCLElBQUksRUFBRSx5Q0FBeUM7WUFDL0MsR0FBRyxFQUFFLGtEQUFrRDtZQUN2RCxHQUFHLEVBQUUsaURBQWlEO1lBQ3RELEdBQUcsRUFBRSx3Q0FBd0M7WUFDN0MsR0FBRyxFQUFFLHVDQUF1QztZQUM1QyxJQUFJLEVBQUUscUNBQXFDO1lBQzNDLEVBQUUsRUFBRSxtQ0FBbUM7U0FDMUMsQ0FBQztRQUlFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUM7SUFDN0MsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1AsSUFBSSxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU87UUFFekIsc0NBQXNDO1FBQ3RDLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRTdCLDhCQUE4QjtRQUM5QixNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUs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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUMxQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUEzeEJELGtDQTJ4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgZGdyYW0gZnJvbSAnZGdyYW0nO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcblxuZXhwb3J0IGludGVyZmFjZSBPbnZpZlNlcnZlckNvbmZpZyB7XG4gICAgaHR0cFBvcnQ6IG51bWJlcjtcbiAgICBydHNwVXJsOiBzdHJpbmc7XG4gICAgZGV2aWNlTmFtZTogc3RyaW5nO1xuICAgIG1hbnVmYWN0dXJlcjogc3RyaW5nO1xuICAgIG1vZGVsOiBzdHJpbmc7XG4gICAgc2VyaWFsTnVtYmVyOiBzdHJpbmc7XG4gICAgaGFyZHdhcmVJZDogc3RyaW5nO1xuICAgIG1hY0FkZHJlc3M6IHN0cmluZztcbiAgICBpcEFkZHJlc3M6IHN0cmluZztcbiAgICBjb25zb2xlPzogQ29uc29sZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQVFpDb21tYW5kIHtcbiAgICBwYW4/OiBudW1iZXI7XG4gICAgdGlsdD86IG51bWJlcjtcbiAgICB6b29tPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgT252aWZTZXJ2ZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHByaXZhdGUgY29uZmlnOiBPbnZpZlNlcnZlckNvbmZpZztcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkaXNjb3ZlcnlTb2NrZXQ6IGRncmFtLlNvY2tldCB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY29uc29sZTogQ29uc29sZTtcbiAgICBwcml2YXRlIHJ1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIC8vIE9OVklGIG5hbWVzcGFjZXNcbiAgICBwcml2YXRlIHJlYWRvbmx5IE5TID0ge1xuICAgICAgICBzb2FwOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMy8wNS9zb2FwLWVudmVsb3BlJyxcbiAgICAgICAgd3NhOiAnaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNC8wOC9hZGRyZXNzaW5nJyxcbiAgICAgICAgd3NkOiAnaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNC9kaXNjb3ZlcnknLFxuICAgICAgICB0ZHM6ICdodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9kZXZpY2Uvd3NkbCcsXG4gICAgICAgIHRydDogJ2h0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL21lZGlhL3dzZGwnLFxuICAgICAgICB0cHR6OiAnaHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMjAvcHR6L3dzZGwnLFxuICAgICAgICB0dDogJ2h0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3NjaGVtYScsXG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZzogT252aWZTZXJ2ZXJDb25maWcpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIHRoaXMuY29uc29sZSA9IGNvbmZpZy5jb25zb2xlIHx8IGNvbnNvbGU7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLnJ1bm5pbmcpIHJldHVybjtcblxuICAgICAgICAvLyBTdGFydCBIVFRQIHNlcnZlciBmb3IgU09BUCByZXF1ZXN0c1xuICAgICAgICBhd2FpdCB0aGlzLnN0YXJ0SHR0cFNlcnZlcigpO1xuXG4gICAgICAgIC8vIFN0YXJ0IFdTLURpc2NvdmVyeSBsaXN0ZW5lclxuICAgICAgICBhd2FpdCB0aGlzLnN0YXJ0RGlzY292ZXJ5KCk7XG5cbiAgICAgICAgdGhpcy5ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW09OVklGIFNlcnZlcl0gU3RhcnRlZCBvbiBwb3J0ICR7dGhpcy5jb25maWcuaHR0cFBvcnR9YCk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZGlzY292ZXJ5U29ja2V0KSB7XG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyeVNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZygnW09OVklGIFNlcnZlcl0gU3RvcHBlZCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3RhcnRIdHRwU2VydmVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVIdHRwUmVxdWVzdChyZXEsIHJlcyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tPTlZJRiBTZXJ2ZXJdIEhUVFAgZXJyb3I6JywgZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5saXN0ZW4odGhpcy5jb25maWcuaHR0cFBvcnQsICcwLjAuMC4wJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBIVFRQICR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfSBmcm9tICR7cmVxLnNvY2tldC5yZW1vdGVBZGRyZXNzfWApO1xuXG4gICAgICAgIGxldCBib2R5ID0gJyc7XG5cbiAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBSZXF1ZXN0IGJvZHkgbGVuZ3RoOiAke2JvZHkubGVuZ3RofWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVTb2FwUmVxdWVzdChyZXEudXJsIHx8ICcvJywgYm9keSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9zb2FwK3htbDsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHJlc3BvbnNlKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdbT05WSUYgU2VydmVyXSBSZXF1ZXN0IGVycm9yOicsIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmYXVsdCA9IHRoaXMuY3JlYXRlU29hcEZhdWx0KCdTZXJ2ZXInLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9zb2FwK3htbDsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChmYXVsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU29hcFJlcXVlc3QocGF0aDogc3RyaW5nLCBib2R5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICAvLyBFeHRyYWN0IGFjdGlvbiBmcm9tIFNPQVAgYm9keVxuICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLmV4dHJhY3RTb2FwQWN0aW9uKGJvZHkpO1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBSZXF1ZXN0OiAke3BhdGh9IEFjdGlvbjogJHthY3Rpb259YCk7XG5cbiAgICAgICAgLy8gUm91dGUgdG8gYXBwcm9wcmlhdGUgaGFuZGxlclxuICAgICAgICBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRTeXN0ZW1EYXRlQW5kVGltZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRTeXN0ZW1EYXRlQW5kVGltZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Q2FwYWJpbGl0aWVzJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldENhcGFiaWxpdGllcygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U2VydmljZXMnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0U2VydmljZXMoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldERldmljZUluZm9ybWF0aW9uJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldERldmljZUluZm9ybWF0aW9uKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXRQcm9maWxlcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRQcm9maWxlcygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0U3RyZWFtVXJpJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFN0cmVhbVVyaShib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFNuYXBzaG90VXJpJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFNuYXBzaG90VXJpKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHZXROb2RlcycpIHx8IGFjdGlvbi5pbmNsdWRlcygnR2V0Tm9kZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXROb2RlcygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Q29uZmlndXJhdGlvbnMnKSAmJiBhY3Rpb24uaW5jbHVkZXMoJ1BUWicpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRQVFpDb25maWd1cmF0aW9ucygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR2V0Q29uZmlndXJhdGlvbicpICYmIGFjdGlvbi5pbmNsdWRlcygnUFRaJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldFBUWkNvbmZpZ3VyYXRpb24oKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFN0YXR1cycpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRQVFpTdGF0dXMoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0NvbnRpbnVvdXNNb3ZlJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUNvbnRpbnVvdXNNb3ZlKGJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnUmVsYXRpdmVNb3ZlJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVJlbGF0aXZlTW92ZShib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0Fic29sdXRlTW92ZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVBYnNvbHV0ZU1vdmUoYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLmluY2x1ZGVzKCdTdG9wJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVBUWlN0b3AoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFByZXNldHMnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0UHJlc2V0cygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnR290b1ByZXNldCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHb3RvUHJlc2V0KGJvZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbi5pbmNsdWRlcygnU2V0UHJlc2V0JykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVNldFByZXNldChib2R5KTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ1JlbW92ZVByZXNldCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVSZW1vdmVQcmVzZXQoYm9keSk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uLmluY2x1ZGVzKCdHb3RvSG9tZVBvc2l0aW9uJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdvdG9Ib21lUG9zaXRpb24oKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ1NldEhvbWVQb3NpdGlvbicpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTZXRIb21lUG9zaXRpb24oKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFNjb3BlcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRTY29wZXMoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFNlcnZpY2VDYXBhYmlsaXRpZXMnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlR2V0U2VydmljZUNhcGFiaWxpdGllcyhwYXRoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldFZpZGVvU291cmNlcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVHZXRWaWRlb1NvdXJjZXMoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24uaW5jbHVkZXMoJ0dldE5ldHdvcmtJbnRlcmZhY2VzJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldE5ldHdvcmtJbnRlcmZhY2VzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBVbmhhbmRsZWQgYWN0aW9uOiAke2FjdGlvbn1gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUdldENhcGFiaWxpdGllcygpOyAvLyBEZWZhdWx0IHJlc3BvbnNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RTb2FwQWN0aW9uKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIC8vIFRyeSB0byBleHRyYWN0IGZyb20gQm9keSBlbGVtZW50XG4gICAgICAgIGNvbnN0IGJvZHlNYXRjaCA9IGJvZHkubWF0Y2goLzxbXjpdKjo/Qm9keVtePl0qPihbXFxzXFxTXSo/KTxcXC9bXjpdKjo/Qm9keT4vaSk7XG4gICAgICAgIGlmIChib2R5TWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGlubmVyQ29udGVudCA9IGJvZHlNYXRjaFsxXTtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbk1hdGNoID0gaW5uZXJDb250ZW50Lm1hdGNoKC88KFteXFxzPlxcL10rKS8pO1xuICAgICAgICAgICAgaWYgKGFjdGlvbk1hdGNoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjdGlvbk1hdGNoWzFdLnJlcGxhY2UoL15bXjpdKzovLCAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdVbmtub3duJztcbiAgICB9XG5cbiAgICAvLyBEZXZpY2UgU2VydmljZSBoYW5kbGVyc1xuICAgIHByaXZhdGUgaGFuZGxlR2V0U3lzdGVtRGF0ZUFuZFRpbWUoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldFN5c3RlbURhdGVBbmRUaW1lUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpTeXN0ZW1EYXRlQW5kVGltZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRhdGVUaW1lVHlwZT5OVFA8L3R0OkRhdGVUaW1lVHlwZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRheWxpZ2h0U2F2aW5ncz5mYWxzZTwvdHQ6RGF5bGlnaHRTYXZpbmdzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VGltZVpvbmU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VFo+VVRDMDwvdHQ6VFo+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VGltZVpvbmU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpVVENEYXRlVGltZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpUaW1lPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpIb3VyPiR7bm93LmdldFVUQ0hvdXJzKCl9PC90dDpIb3VyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpNaW51dGU+JHtub3cuZ2V0VVRDTWludXRlcygpfTwvdHQ6TWludXRlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTZWNvbmQ+JHtub3cuZ2V0VVRDU2Vjb25kcygpfTwvdHQ6U2Vjb25kPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpUaW1lPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkRhdGU+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlllYXI+JHtub3cuZ2V0VVRDRnVsbFllYXIoKX08L3R0OlllYXI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok1vbnRoPiR7bm93LmdldFVUQ01vbnRoKCkgKyAxfTwvdHQ6TW9udGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkRheT4ke25vdy5nZXRVVENEYXRlKCl9PC90dDpEYXk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OkRhdGU+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VVRDRGF0ZVRpbWU+XG4gICAgICAgICAgICAgICAgPC90ZHM6U3lzdGVtRGF0ZUFuZFRpbWU+XG4gICAgICAgICAgICA8L3RkczpHZXRTeXN0ZW1EYXRlQW5kVGltZVJlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldENhcGFiaWxpdGllcygpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gYGh0dHA6Ly8ke3RoaXMuY29uZmlnLmlwQWRkcmVzc306JHt0aGlzLmNvbmZpZy5odHRwUG9ydH1gO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0ZHM6R2V0Q2FwYWJpbGl0aWVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpDYXBhYmlsaXRpZXM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpEZXZpY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9kZXZpY2Vfc2VydmljZTwvdHQ6WEFkZHI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TmV0d29yaz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SVBGaWx0ZXI+ZmFsc2U8L3R0OklQRmlsdGVyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpaZXJvQ29uZmlndXJhdGlvbj5mYWxzZTwvdHQ6WmVyb0NvbmZpZ3VyYXRpb24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OklQVmVyc2lvbjY+ZmFsc2U8L3R0OklQVmVyc2lvbjY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkR5bkROUz5mYWxzZTwvdHQ6RHluRE5TPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpOZXR3b3JrPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlN5c3RlbT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RGlzY292ZXJ5UmVzb2x2ZT5mYWxzZTwvdHQ6RGlzY292ZXJ5UmVzb2x2ZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RGlzY292ZXJ5QnllPnRydWU8L3R0OkRpc2NvdmVyeUJ5ZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmVtb3RlRGlzY292ZXJ5PmZhbHNlPC90dDpSZW1vdGVEaXNjb3Zlcnk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlN5c3RlbUJhY2t1cD5mYWxzZTwvdHQ6U3lzdGVtQmFja3VwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTeXN0ZW1Mb2dnaW5nPmZhbHNlPC90dDpTeXN0ZW1Mb2dnaW5nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpGaXJtd2FyZVVwZ3JhZGU+ZmFsc2U8L3R0OkZpcm13YXJlVXBncmFkZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6U3lzdGVtPlxuICAgICAgICAgICAgICAgICAgICA8L3R0OkRldmljZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0Ok1lZGlhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlhBZGRyPiR7YmFzZVVybH0vb252aWYvbWVkaWFfc2VydmljZTwvdHQ6WEFkZHI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U3RyZWFtaW5nQ2FwYWJpbGl0aWVzPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSVFBNdWx0aWNhc3Q+ZmFsc2U8L3R0OlJUUE11bHRpY2FzdD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UlRQX1RDUD50cnVlPC90dDpSVFBfVENQPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSVFBfUlRTUF9UQ1A+dHJ1ZTwvdHQ6UlRQX1JUU1BfVENQPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpTdHJlYW1pbmdDYXBhYmlsaXRpZXM+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6TWVkaWE+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpQVFo+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9wdHpfc2VydmljZTwvdHQ6WEFkZHI+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UFRaPlxuICAgICAgICAgICAgICAgIDwvdGRzOkNhcGFiaWxpdGllcz5cbiAgICAgICAgICAgIDwvdGRzOkdldENhcGFiaWxpdGllc1Jlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFNlcnZpY2VzKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSBgaHR0cDovLyR7dGhpcy5jb25maWcuaXBBZGRyZXNzfToke3RoaXMuY29uZmlnLmh0dHBQb3J0fWA7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRkczpHZXRTZXJ2aWNlc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2VydmljZT5cbiAgICAgICAgICAgICAgICAgICAgPHRkczpOYW1lc3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvZGV2aWNlL3dzZGw8L3RkczpOYW1lc3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9kZXZpY2Vfc2VydmljZTwvdGRzOlhBZGRyPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlZlcnNpb24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TWFqb3I+MjwvdHQ6TWFqb3I+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TWlub3I+MDwvdHQ6TWlub3I+XG4gICAgICAgICAgICAgICAgICAgIDwvdGRzOlZlcnNpb24+XG4gICAgICAgICAgICAgICAgPC90ZHM6U2VydmljZT5cbiAgICAgICAgICAgICAgICA8dGRzOlNlcnZpY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6TmFtZXNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL21lZGlhL3dzZGw8L3RkczpOYW1lc3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9tZWRpYV9zZXJ2aWNlPC90ZHM6WEFkZHI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6VmVyc2lvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpNYWpvcj4yPC90dDpNYWpvcj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpNaW5vcj4wPC90dDpNaW5vcj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZHM6VmVyc2lvbj5cbiAgICAgICAgICAgICAgICA8L3RkczpTZXJ2aWNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2VydmljZT5cbiAgICAgICAgICAgICAgICAgICAgPHRkczpOYW1lc3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMjAvcHR6L3dzZGw8L3RkczpOYW1lc3BhY2U+XG4gICAgICAgICAgICAgICAgICAgIDx0ZHM6WEFkZHI+JHtiYXNlVXJsfS9vbnZpZi9wdHpfc2VydmljZTwvdGRzOlhBZGRyPlxuICAgICAgICAgICAgICAgICAgICA8dGRzOlZlcnNpb24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TWFqb3I+MjwvdHQ6TWFqb3I+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TWlub3I+MDwvdHQ6TWlub3I+XG4gICAgICAgICAgICAgICAgICAgIDwvdGRzOlZlcnNpb24+XG4gICAgICAgICAgICAgICAgPC90ZHM6U2VydmljZT5cbiAgICAgICAgICAgIDwvdGRzOkdldFNlcnZpY2VzUmVzcG9uc2U+XG4gICAgICAgIGApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0RGV2aWNlSW5mb3JtYXRpb24oKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldERldmljZUluZm9ybWF0aW9uUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpNYW51ZmFjdHVyZXI+JHt0aGlzLmNvbmZpZy5tYW51ZmFjdHVyZXJ9PC90ZHM6TWFudWZhY3R1cmVyPlxuICAgICAgICAgICAgICAgIDx0ZHM6TW9kZWw+JHt0aGlzLmNvbmZpZy5tb2RlbH08L3RkczpNb2RlbD5cbiAgICAgICAgICAgICAgICA8dGRzOkZpcm13YXJlVmVyc2lvbj4xLjAuMDwvdGRzOkZpcm13YXJlVmVyc2lvbj5cbiAgICAgICAgICAgICAgICA8dGRzOlNlcmlhbE51bWJlcj4ke3RoaXMuY29uZmlnLnNlcmlhbE51bWJlcn08L3RkczpTZXJpYWxOdW1iZXI+XG4gICAgICAgICAgICAgICAgPHRkczpIYXJkd2FyZUlkPiR7dGhpcy5jb25maWcuaGFyZHdhcmVJZH08L3RkczpIYXJkd2FyZUlkPlxuICAgICAgICAgICAgPC90ZHM6R2V0RGV2aWNlSW5mb3JtYXRpb25SZXNwb25zZT5cbiAgICAgICAgYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTY29wZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dGRzOkdldFNjb3Blc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2NvcGVzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6U2NvcGVEZWY+Rml4ZWQ8L3R0OlNjb3BlRGVmPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6U2NvcGVJdGVtPm9udmlmOi8vd3d3Lm9udmlmLm9yZy90eXBlL3ZpZGVvX2VuY29kZXI8L3R0OlNjb3BlSXRlbT5cbiAgICAgICAgICAgICAgICA8L3RkczpTY29wZXM+XG4gICAgICAgICAgICAgICAgPHRkczpTY29wZXM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpTY29wZURlZj5GaXhlZDwvdHQ6U2NvcGVEZWY+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpTY29wZUl0ZW0+b252aWY6Ly93d3cub252aWYub3JnL3R5cGUvcHR6PC90dDpTY29wZUl0ZW0+XG4gICAgICAgICAgICAgICAgPC90ZHM6U2NvcGVzPlxuICAgICAgICAgICAgICAgIDx0ZHM6U2NvcGVzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6U2NvcGVEZWY+Rml4ZWQ8L3R0OlNjb3BlRGVmPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6U2NvcGVJdGVtPm9udmlmOi8vd3d3Lm9udmlmLm9yZy9Qcm9maWxlL1N0cmVhbWluZzwvdHQ6U2NvcGVJdGVtPlxuICAgICAgICAgICAgICAgIDwvdGRzOlNjb3Blcz5cbiAgICAgICAgICAgICAgICA8dGRzOlNjb3Blcz5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlNjb3BlRGVmPkZpeGVkPC90dDpTY29wZURlZj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlNjb3BlSXRlbT5vbnZpZjovL3d3dy5vbnZpZi5vcmcvbmFtZS8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5kZXZpY2VOYW1lKX08L3R0OlNjb3BlSXRlbT5cbiAgICAgICAgICAgICAgICA8L3RkczpTY29wZXM+XG4gICAgICAgICAgICAgICAgPHRkczpTY29wZXM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpTY29wZURlZj5GaXhlZDwvdHQ6U2NvcGVEZWY+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpTY29wZUl0ZW0+b252aWY6Ly93d3cub252aWYub3JnL2hhcmR3YXJlLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLm1vZGVsKX08L3R0OlNjb3BlSXRlbT5cbiAgICAgICAgICAgICAgICA8L3RkczpTY29wZXM+XG4gICAgICAgICAgICA8L3RkczpHZXRTY29wZXNSZXNwb25zZT5cbiAgICAgICAgYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTZXJ2aWNlQ2FwYWJpbGl0aWVzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChwYXRoLmluY2x1ZGVzKCdwdHonKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICAgICAgPHRwdHo6R2V0U2VydmljZUNhcGFiaWxpdGllc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgICAgICA8dHB0ejpDYXBhYmlsaXRpZXMgRUZsaXA9XCJmYWxzZVwiIFJldmVyc2U9XCJmYWxzZVwiIEdldENvbXBhdGlibGVDb25maWd1cmF0aW9ucz1cImZhbHNlXCIgTW92ZVN0YXR1cz1cInRydWVcIiBTdGF0dXNQb3NpdGlvbj1cInRydWVcIi8+XG4gICAgICAgICAgICAgICAgPC90cHR6OkdldFNlcnZpY2VDYXBhYmlsaXRpZXNSZXNwb25zZT5cbiAgICAgICAgICAgIGApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRkczpHZXRTZXJ2aWNlQ2FwYWJpbGl0aWVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRkczpDYXBhYmlsaXRpZXMvPlxuICAgICAgICAgICAgPC90ZHM6R2V0U2VydmljZUNhcGFiaWxpdGllc1Jlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldE5ldHdvcmtJbnRlcmZhY2VzKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRkczpHZXROZXR3b3JrSW50ZXJmYWNlc1Jlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0ZHM6TmV0d29ya0ludGVyZmFjZXMgdG9rZW49XCJldGgwXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpFbmFibGVkPnRydWU8L3R0OkVuYWJsZWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJbmZvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok5hbWU+ZXRoMDwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpId0FkZHJlc3M+JHt0aGlzLmNvbmZpZy5tYWNBZGRyZXNzfTwvdHQ6SHdBZGRyZXNzPlxuICAgICAgICAgICAgICAgICAgICA8L3R0OkluZm8+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJUHY0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkVuYWJsZWQ+dHJ1ZTwvdHQ6RW5hYmxlZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpDb25maWc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok1hbnVhbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkFkZHJlc3M+JHt0aGlzLmNvbmZpZy5pcEFkZHJlc3N9PC90dDpBZGRyZXNzPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UHJlZml4TGVuZ3RoPjI0PC90dDpQcmVmaXhMZW5ndGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpNYW51YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkRIQ1A+ZmFsc2U8L3R0OkRIQ1A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OkNvbmZpZz5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpJUHY0PlxuICAgICAgICAgICAgICAgIDwvdGRzOk5ldHdvcmtJbnRlcmZhY2VzPlxuICAgICAgICAgICAgPC90ZHM6R2V0TmV0d29ya0ludGVyZmFjZXNSZXNwb25zZT5cbiAgICAgICAgYCk7XG4gICAgfVxuXG4gICAgLy8gTWVkaWEgU2VydmljZSBoYW5kbGVyc1xuICAgIHByaXZhdGUgaGFuZGxlR2V0UHJvZmlsZXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHJ0OkdldFByb2ZpbGVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRydDpQcm9maWxlcyB0b2tlbj1cIk1haW5Qcm9maWxlXCIgZml4ZWQ9XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPk1haW5TdHJlYW08L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpWaWRlb1NvdXJjZUNvbmZpZ3VyYXRpb24gdG9rZW49XCJWaWRlb1NvdXJjZTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvU291cmNlMTwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTb3VyY2VUb2tlbj5WaWRlb1NvdXJjZTE8L3R0OlNvdXJjZVRva2VuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkJvdW5kcyB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxOTIwXCIgaGVpZ2h0PVwiMTA4MFwiLz5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpWaWRlb1NvdXJjZUNvbmZpZ3VyYXRpb24+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpWaWRlb0VuY29kZXJDb25maWd1cmF0aW9uIHRva2VuPVwiVmlkZW9FbmNvZGVyMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok5hbWU+VmlkZW9FbmNvZGVyMTwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpFbmNvZGluZz5IMjY0PC90dDpFbmNvZGluZz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSZXNvbHV0aW9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpXaWR0aD4xOTIwPC90dDpXaWR0aD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SGVpZ2h0PjEwODA8L3R0OkhlaWdodD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6UmVzb2x1dGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpRdWFsaXR5PjU8L3R0OlF1YWxpdHk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmF0ZUNvbnRyb2w+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkZyYW1lUmF0ZUxpbWl0PjMwPC90dDpGcmFtZVJhdGVMaW1pdD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RW5jb2RpbmdJbnRlcnZhbD4xPC90dDpFbmNvZGluZ0ludGVydmFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpCaXRyYXRlTGltaXQ+NDA5NjwvdHQ6Qml0cmF0ZUxpbWl0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpSYXRlQ29udHJvbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpIMjY0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpHb3ZMZW5ndGg+MzA8L3R0Okdvdkxlbmd0aD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SDI2NFByb2ZpbGU+SGlnaDwvdHQ6SDI2NFByb2ZpbGU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0OkgyNjQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6TXVsdGljYXN0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpBZGRyZXNzPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VHlwZT5JUHY0PC90dDpUeXBlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SVB2NEFkZHJlc3M+MC4wLjAuMDwvdHQ6SVB2NEFkZHJlc3M+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpBZGRyZXNzPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpQb3J0PjA8L3R0OlBvcnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlRUTD4wPC90dDpUVEw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkF1dG9TdGFydD5mYWxzZTwvdHQ6QXV0b1N0YXJ0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpNdWx0aWNhc3Q+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6U2Vzc2lvblRpbWVvdXQ+UFQ2MFM8L3R0OlNlc3Npb25UaW1lb3V0PlxuICAgICAgICAgICAgICAgICAgICA8L3R0OlZpZGVvRW5jb2RlckNvbmZpZ3VyYXRpb24+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpQVFpDb25maWd1cmF0aW9uIHRva2VuPVwiUFRaMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok5hbWU+UFRaMTwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOb2RlVG9rZW4+UFRaTm9kZTE8L3R0Ok5vZGVUb2tlbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNQYW5UaWx0VmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1pvb21WZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0UFRaVGltZW91dD5QVDEwUzwvdHQ6RGVmYXVsdFBUWlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UGFuVGlsdExpbWl0cz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmFuZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVUkk+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9QYW5UaWx0U3BhY2VzL1Bvc2l0aW9uR2VuZXJpY1NwYWNlPC90dDpVUkk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WVJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OllSYW5nZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3R0OlJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpQYW5UaWx0TGltaXRzPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0Olpvb21MaW1pdHM+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9Qb3NpdGlvbkdlbmVyaWNTcGFjZTwvdHQ6VVJJPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WFJhbmdlPjx0dDpNaW4+MDwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6UmFuZ2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3R0Olpvb21MaW1pdHM+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UFRaQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICA8L3RydDpQcm9maWxlcz5cbiAgICAgICAgICAgICAgICA8dHJ0OlByb2ZpbGVzIHRva2VuPVwiU3ViUHJvZmlsZVwiIGZpeGVkPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5TdWJTdHJlYW08L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpWaWRlb1NvdXJjZUNvbmZpZ3VyYXRpb24gdG9rZW49XCJWaWRlb1NvdXJjZTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvU291cmNlMTwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpVc2VDb3VudD4xPC90dDpVc2VDb3VudD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpTb3VyY2VUb2tlbj5WaWRlb1NvdXJjZTE8L3R0OlNvdXJjZVRva2VuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkJvdW5kcyB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCI2NDBcIiBoZWlnaHQ9XCI0ODBcIi8+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6VmlkZW9Tb3VyY2VDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VmlkZW9FbmNvZGVyQ29uZmlndXJhdGlvbiB0b2tlbj1cIlZpZGVvRW5jb2RlcjJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlZpZGVvRW5jb2RlcjI8L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VXNlQ291bnQ+MTwvdHQ6VXNlQ291bnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RW5jb2Rpbmc+SDI2NDwvdHQ6RW5jb2Rpbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmVzb2x1dGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6V2lkdGg+NjQwPC90dDpXaWR0aD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SGVpZ2h0PjQ4MDwvdHQ6SGVpZ2h0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpSZXNvbHV0aW9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlF1YWxpdHk+MzwvdHQ6UXVhbGl0eT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpSYXRlQ29udHJvbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6RnJhbWVSYXRlTGltaXQ+MTU8L3R0OkZyYW1lUmF0ZUxpbWl0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpFbmNvZGluZ0ludGVydmFsPjE8L3R0OkVuY29kaW5nSW50ZXJ2YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkJpdHJhdGVMaW1pdD41MTI8L3R0OkJpdHJhdGVMaW1pdD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6UmF0ZUNvbnRyb2w+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6SDI2ND5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6R292TGVuZ3RoPjMwPC90dDpHb3ZMZW5ndGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkgyNjRQcm9maWxlPk1haW48L3R0OkgyNjRQcm9maWxlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpIMjY0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0Ok11bHRpY2FzdD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6QWRkcmVzcz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlR5cGU+SVB2NDwvdHQ6VHlwZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OklQdjRBZGRyZXNzPjAuMC4wLjA8L3R0OklQdjRBZGRyZXNzPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6QWRkcmVzcz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UG9ydD4wPC90dDpQb3J0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpUVEw+MDwvdHQ6VFRMPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpBdXRvU3RhcnQ+ZmFsc2U8L3R0OkF1dG9TdGFydD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6TXVsdGljYXN0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlNlc3Npb25UaW1lb3V0PlBUNjBTPC90dDpTZXNzaW9uVGltZW91dD5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpWaWRlb0VuY29kZXJDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6UFRaQ29uZmlndXJhdGlvbiB0b2tlbj1cIlBUWjFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpOYW1lPlBUWjE8L3R0Ok5hbWU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VXNlQ291bnQ+MTwvdHQ6VXNlQ291bnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6Tm9kZVRva2VuPlBUWk5vZGUxPC90dDpOb2RlVG9rZW4+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UFRaQ29uZmlndXJhdGlvbj5cbiAgICAgICAgICAgICAgICA8L3RydDpQcm9maWxlcz5cbiAgICAgICAgICAgIDwvdHJ0OkdldFByb2ZpbGVzUmVzcG9uc2U+XG4gICAgICAgIGApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0U3RyZWFtVXJpKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIC8vIENoZWNrIHdoaWNoIHByb2ZpbGUgaXMgcmVxdWVzdGVkXG4gICAgICAgIGNvbnN0IGlzU3Vic3RyZWFtID0gYm9keS5pbmNsdWRlcygnU3ViUHJvZmlsZScpO1xuICAgICAgICBjb25zdCBydHNwVXJsID0gdGhpcy5jb25maWcucnRzcFVybC5yZXBsYWNlKCdzdWJ0eXBlPTAnLCBpc1N1YnN0cmVhbSA/ICdzdWJ0eXBlPTEnIDogJ3N1YnR5cGU9MCcpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRydDpHZXRTdHJlYW1VcmlSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHJ0Ok1lZGlhVXJpPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VXJpPiR7cnRzcFVybH08L3R0OlVyaT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkludmFsaWRBZnRlckNvbm5lY3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlckNvbm5lY3Q+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJbnZhbGlkQWZ0ZXJSZWJvb3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlclJlYm9vdD5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlRpbWVvdXQ+UFQ2MFM8L3R0OlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgPC90cnQ6TWVkaWFVcmk+XG4gICAgICAgICAgICA8L3RydDpHZXRTdHJlYW1VcmlSZXNwb25zZT5cbiAgICAgICAgYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRTbmFwc2hvdFVyaSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cnQ6R2V0U25hcHNob3RVcmlSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHJ0Ok1lZGlhVXJpPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6VXJpPiR7dGhpcy5jb25maWcucnRzcFVybH08L3R0OlVyaT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkludmFsaWRBZnRlckNvbm5lY3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlckNvbm5lY3Q+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpJbnZhbGlkQWZ0ZXJSZWJvb3Q+ZmFsc2U8L3R0OkludmFsaWRBZnRlclJlYm9vdD5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlRpbWVvdXQ+UFQ2MFM8L3R0OlRpbWVvdXQ+XG4gICAgICAgICAgICAgICAgPC90cnQ6TWVkaWFVcmk+XG4gICAgICAgICAgICA8L3RydDpHZXRTbmFwc2hvdFVyaVJlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFZpZGVvU291cmNlcygpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cnQ6R2V0VmlkZW9Tb3VyY2VzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRydDpWaWRlb1NvdXJjZXMgdG9rZW49XCJWaWRlb1NvdXJjZTFcIj5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkZyYW1lcmF0ZT4zMDwvdHQ6RnJhbWVyYXRlPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6UmVzb2x1dGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpXaWR0aD4xOTIwPC90dDpXaWR0aD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpIZWlnaHQ+MTA4MDwvdHQ6SGVpZ2h0PlxuICAgICAgICAgICAgICAgICAgICA8L3R0OlJlc29sdXRpb24+XG4gICAgICAgICAgICAgICAgPC90cnQ6VmlkZW9Tb3VyY2VzPlxuICAgICAgICAgICAgPC90cnQ6R2V0VmlkZW9Tb3VyY2VzUmVzcG9uc2U+XG4gICAgICAgIGApO1xuICAgIH1cblxuICAgIC8vIFBUWiBTZXJ2aWNlIGhhbmRsZXJzXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXROb2RlcygpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cHR6OkdldE5vZGVzUmVzcG9uc2U+XG4gICAgICAgICAgICAgICAgPHRwdHo6UFRaTm9kZSB0b2tlbj1cIlBUWk5vZGUxXCIgRml4ZWRIb21lUG9zaXRpb249XCJmYWxzZVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5QVFogTm9kZTwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlN1cHBvcnRlZFBUWlNwYWNlcz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpDb250aW51b3VzUGFuVGlsdFZlbG9jaXR5U3BhY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlVSST5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1BhblRpbHRTcGFjZXMvVmVsb2NpdHlHZW5lcmljU3BhY2U8L3R0OlVSST5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WFJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OlhSYW5nZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WVJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OllSYW5nZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OkNvbnRpbnVvdXNab29tVmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovWm9vbVNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6VVJJPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpDb250aW51b3VzWm9vbVZlbG9jaXR5U3BhY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dHQ6UmVsYXRpdmVQYW5UaWx0VHJhbnNsYXRpb25TcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6VVJJPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9UcmFuc2xhdGlvbkdlbmVyaWNTcGFjZTwvdHQ6VVJJPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpYUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WFJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpZUmFuZ2U+PHR0Ok1pbj4tMTwvdHQ6TWluPjx0dDpNYXg+MTwvdHQ6TWF4PjwvdHQ6WVJhbmdlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90dDpSZWxhdGl2ZVBhblRpbHRUcmFuc2xhdGlvblNwYWNlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlJlbGF0aXZlWm9vbVRyYW5zbGF0aW9uU3BhY2U+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlVSST5odHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1pvb21TcGFjZXMvVHJhbnNsYXRpb25HZW5lcmljU3BhY2U8L3R0OlVSST5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHQ6WFJhbmdlPjx0dDpNaW4+LTE8L3R0Ok1pbj48dHQ6TWF4PjE8L3R0Ok1heD48L3R0OlhSYW5nZT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHQ6UmVsYXRpdmVab29tVHJhbnNsYXRpb25TcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgPC90dDpTdXBwb3J0ZWRQVFpTcGFjZXM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpNYXhpbXVtTnVtYmVyT2ZQcmVzZXRzPjE2PC90dDpNYXhpbXVtTnVtYmVyT2ZQcmVzZXRzPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6SG9tZVN1cHBvcnRlZD5mYWxzZTwvdHQ6SG9tZVN1cHBvcnRlZD5cbiAgICAgICAgICAgICAgICA8L3RwdHo6UFRaTm9kZT5cbiAgICAgICAgICAgIDwvdHB0ejpHZXROb2Rlc1Jlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdldFBUWkNvbmZpZ3VyYXRpb25zKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYFxuICAgICAgICAgICAgPHRwdHo6R2V0Q29uZmlndXJhdGlvbnNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHB0ejpQVFpDb25maWd1cmF0aW9uIHRva2VuPVwiUFRaMVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5QVFogQ29uZmlndXJhdGlvbjwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlVzZUNvdW50PjI8L3R0OlVzZUNvdW50PlxuICAgICAgICAgICAgICAgICAgICA8dHQ6Tm9kZVRva2VuPlBUWk5vZGUxPC90dDpOb2RlVG9rZW4+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNQYW5UaWx0VmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRlZmF1bHRDb250aW51b3VzWm9vbVZlbG9jaXR5U3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9ab29tU3BhY2VzL1ZlbG9jaXR5R2VuZXJpY1NwYWNlPC90dDpEZWZhdWx0Q29udGludW91c1pvb21WZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6RGVmYXVsdFBUWlRpbWVvdXQ+UFQxMFM8L3R0OkRlZmF1bHRQVFpUaW1lb3V0PlxuICAgICAgICAgICAgICAgIDwvdHB0ejpQVFpDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgPC90cHR6OkdldENvbmZpZ3VyYXRpb25zUmVzcG9uc2U+XG4gICAgICAgIGApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2V0UFRaQ29uZmlndXJhdGlvbigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cHR6OkdldENvbmZpZ3VyYXRpb25SZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHB0ejpQVFpDb25maWd1cmF0aW9uIHRva2VuPVwiUFRaMVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6TmFtZT5QVFogQ29uZmlndXJhdGlvbjwvdHQ6TmFtZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlVzZUNvdW50PjI8L3R0OlVzZUNvdW50PlxuICAgICAgICAgICAgICAgICAgICA8dHQ6Tm9kZVRva2VuPlBUWk5vZGUxPC90dDpOb2RlVG9rZW4+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpEZWZhdWx0Q29udGludW91c1BhblRpbHRWZWxvY2l0eVNwYWNlPmh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9WZWxvY2l0eUdlbmVyaWNTcGFjZTwvdHQ6RGVmYXVsdENvbnRpbnVvdXNQYW5UaWx0VmVsb2NpdHlTcGFjZT5cbiAgICAgICAgICAgICAgICAgICAgPHR0OkRlZmF1bHRDb250aW51b3VzWm9vbVZlbG9jaXR5U3BhY2U+aHR0cDovL3d3dy5vbnZpZi5vcmcvdmVyMTAvdHB0ei9ab29tU3BhY2VzL1ZlbG9jaXR5R2VuZXJpY1NwYWNlPC90dDpEZWZhdWx0Q29udGludW91c1pvb21WZWxvY2l0eVNwYWNlPlxuICAgICAgICAgICAgICAgICAgICA8dHQ6RGVmYXVsdFBUWlRpbWVvdXQ+UFQxMFM8L3R0OkRlZmF1bHRQVFpUaW1lb3V0PlxuICAgICAgICAgICAgICAgIDwvdHB0ejpQVFpDb25maWd1cmF0aW9uPlxuICAgICAgICAgICAgPC90cHR6OkdldENvbmZpZ3VyYXRpb25SZXNwb25zZT5cbiAgICAgICAgYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRQVFpTdGF0dXMoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHB0ejpHZXRTdGF0dXNSZXNwb25zZT5cbiAgICAgICAgICAgICAgICA8dHB0ejpQVFpTdGF0dXM+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpQb3NpdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpQYW5UaWx0IHg9XCIwXCIgeT1cIjBcIiBzcGFjZT1cImh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3RwdHovUGFuVGlsdFNwYWNlcy9Qb3NpdGlvbkdlbmVyaWNTcGFjZVwiLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpab29tIHg9XCIwXCIgc3BhY2U9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC90cHR6L1pvb21TcGFjZXMvUG9zaXRpb25HZW5lcmljU3BhY2VcIi8+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6UG9zaXRpb24+XG4gICAgICAgICAgICAgICAgICAgIDx0dDpNb3ZlU3RhdHVzPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHR0OlBhblRpbHQ+SURMRTwvdHQ6UGFuVGlsdD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0dDpab29tPklETEU8L3R0Olpvb20+XG4gICAgICAgICAgICAgICAgICAgIDwvdHQ6TW92ZVN0YXR1cz5cbiAgICAgICAgICAgICAgICAgICAgPHR0OlV0Y1RpbWU+JHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9PC90dDpVdGNUaW1lPlxuICAgICAgICAgICAgICAgIDwvdHB0ejpQVFpTdGF0dXM+XG4gICAgICAgICAgICA8L3RwdHo6R2V0U3RhdHVzUmVzcG9uc2U+XG4gICAgICAgIGApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlQ29udGludW91c01vdmUoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgcHR6ID0gdGhpcy5leHRyYWN0UFRaVmVsb2NpdHkoYm9keSk7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRiBTZXJ2ZXJdIENvbnRpbnVvdXNNb3ZlOiBwYW49JHtwdHoucGFufSwgdGlsdD0ke3B0ei50aWx0fSwgem9vbT0ke3B0ei56b29tfWApO1xuICAgICAgICB0aGlzLmVtaXQoJ3B0eicsIHsgdHlwZTogJ2NvbnRpbnVvdXMnLCAuLi5wdHogfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OkNvbnRpbnVvdXNNb3ZlUmVzcG9uc2UvPmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlUmVsYXRpdmVNb3ZlKGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHB0eiA9IHRoaXMuZXh0cmFjdFBUWlRyYW5zbGF0aW9uKGJvZHkpO1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKGBbT05WSUYgU2VydmVyXSBSZWxhdGl2ZU1vdmU6IHBhbj0ke3B0ei5wYW59LCB0aWx0PSR7cHR6LnRpbHR9LCB6b29tPSR7cHR6Lnpvb219YCk7XG4gICAgICAgIHRoaXMuZW1pdCgncHR6JywgeyB0eXBlOiAncmVsYXRpdmUnLCAuLi5wdHogfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OlJlbGF0aXZlTW92ZVJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUFic29sdXRlTW92ZShib2R5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBwdHogPSB0aGlzLmV4dHJhY3RQVFpQb3NpdGlvbihib2R5KTtcbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW09OVklGIFNlcnZlcl0gQWJzb2x1dGVNb3ZlOiBwYW49JHtwdHoucGFufSwgdGlsdD0ke3B0ei50aWx0fSwgem9vbT0ke3B0ei56b29tfWApO1xuICAgICAgICB0aGlzLmVtaXQoJ3B0eicsIHsgdHlwZTogJ2Fic29sdXRlJywgLi4ucHR6IH0pO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGA8dHB0ejpBYnNvbHV0ZU1vdmVSZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVQVFpTdG9wKCk6IHN0cmluZyB7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tPTlZJRiBTZXJ2ZXJdIFBUWiBTdG9wJyk7XG4gICAgICAgIHRoaXMuZW1pdCgncHR6JywgeyB0eXBlOiAnc3RvcCcgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBTb2FwUmVzcG9uc2UoYDx0cHR6OlN0b3BSZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHZXRQcmVzZXRzKCk6IHN0cmluZyB7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tPTlZJRiBTZXJ2ZXJdIEdldFByZXNldHMnKTtcbiAgICAgICAgLy8gUmV0dXJuIGVtcHR5IHByZXNldCBsaXN0IC0gdGhlIGNhbWVyYSBkb2Vzbid0IHN1cHBvcnQgcHJlc2V0cyB2aWEgRFZSSVBcbiAgICAgICAgLy8gYnV0IHdlIG5lZWQgdG8gcmV0dXJuIGEgdmFsaWQgcmVzcG9uc2UgZm9yIEZyaWdhdGVcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgXG4gICAgICAgICAgICA8dHB0ejpHZXRQcmVzZXRzUmVzcG9uc2U+XG4gICAgICAgICAgICA8L3RwdHo6R2V0UHJlc2V0c1Jlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdvdG9QcmVzZXQoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgcHJlc2V0TWF0Y2ggPSBib2R5Lm1hdGNoKC9QcmVzZXRUb2tlbltePl0qPihbXjxdKik8L2kpO1xuICAgICAgICBjb25zdCBwcmVzZXRUb2tlbiA9IHByZXNldE1hdGNoID8gcHJlc2V0TWF0Y2hbMV0gOiAndW5rbm93bic7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRiBTZXJ2ZXJdIEdvdG9QcmVzZXQ6ICR7cHJlc2V0VG9rZW59YCk7XG4gICAgICAgIHRoaXMuZW1pdCgncHR6JywgeyB0eXBlOiAncHJlc2V0JywgcHJlc2V0OiBwcmVzZXRUb2tlbiB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6R290b1ByZXNldFJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVNldFByZXNldChib2R5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBuYW1lTWF0Y2ggPSBib2R5Lm1hdGNoKC9QcmVzZXROYW1lW14+XSo+KFtePF0qKTwvaSk7XG4gICAgICAgIGNvbnN0IHByZXNldE5hbWUgPSBuYW1lTWF0Y2ggPyBuYW1lTWF0Y2hbMV0gOiAnUHJlc2V0JztcbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW09OVklGIFNlcnZlcl0gU2V0UHJlc2V0OiAke3ByZXNldE5hbWV9YCk7XG4gICAgICAgIC8vIFJldHVybiBhIGZha2UgdG9rZW4gc2luY2Ugd2UgZG9uJ3QgYWN0dWFsbHkgc3RvcmUgcHJlc2V0c1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGBcbiAgICAgICAgICAgIDx0cHR6OlNldFByZXNldFJlc3BvbnNlPlxuICAgICAgICAgICAgICAgIDx0cHR6OlByZXNldFRva2VuPnByZXNldF8xPC90cHR6OlByZXNldFRva2VuPlxuICAgICAgICAgICAgPC90cHR6OlNldFByZXNldFJlc3BvbnNlPlxuICAgICAgICBgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVJlbW92ZVByZXNldChib2R5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBwcmVzZXRNYXRjaCA9IGJvZHkubWF0Y2goL1ByZXNldFRva2VuW14+XSo+KFtePF0qKTwvaSk7XG4gICAgICAgIGNvbnN0IHByZXNldFRva2VuID0gcHJlc2V0TWF0Y2ggPyBwcmVzZXRNYXRjaFsxXSA6ICd1bmtub3duJztcbiAgICAgICAgdGhpcy5jb25zb2xlLmxvZyhgW09OVklGIFNlcnZlcl0gUmVtb3ZlUHJlc2V0OiAke3ByZXNldFRva2VufWApO1xuICAgICAgICByZXR1cm4gdGhpcy53cmFwU29hcFJlc3BvbnNlKGA8dHB0ejpSZW1vdmVQcmVzZXRSZXNwb25zZS8+YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHb3RvSG9tZVBvc2l0aW9uKCk6IHN0cmluZyB7XG4gICAgICAgIHRoaXMuY29uc29sZS5sb2coJ1tPTlZJRiBTZXJ2ZXJdIEdvdG9Ib21lUG9zaXRpb24nKTtcbiAgICAgICAgdGhpcy5lbWl0KCdwdHonLCB7IHR5cGU6ICdob21lJyB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6R290b0hvbWVQb3NpdGlvblJlc3BvbnNlLz5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVNldEhvbWVQb3NpdGlvbigpOiBzdHJpbmcge1xuICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbT05WSUYgU2VydmVyXSBTZXRIb21lUG9zaXRpb24nKTtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcFNvYXBSZXNwb25zZShgPHRwdHo6U2V0SG9tZVBvc2l0aW9uUmVzcG9uc2UvPmApO1xuICAgIH1cblxuICAgIC8vIEhlbHBlciBtZXRob2RzIGZvciBleHRyYWN0aW5nIFBUWiB2YWx1ZXMgZnJvbSBTT0FQIHJlcXVlc3RzXG4gICAgcHJpdmF0ZSBleHRyYWN0UFRaVmVsb2NpdHkoYm9keTogc3RyaW5nKTogUFRaQ29tbWFuZCB7XG4gICAgICAgIGNvbnN0IHJlc3VsdDogUFRaQ29tbWFuZCA9IHt9O1xuXG4gICAgICAgIC8vIEV4dHJhY3QgUGFuVGlsdCB2ZWxvY2l0eVxuICAgICAgICBjb25zdCBwYW5UaWx0TWF0Y2ggPSBib2R5Lm1hdGNoKC9QYW5UaWx0W14+XSp4PVwiKFteXCJdKilcIltePl0qeT1cIihbXlwiXSopXCIvaSk7XG4gICAgICAgIGlmIChwYW5UaWx0TWF0Y2gpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wYW4gPSBwYXJzZUZsb2F0KHBhblRpbHRNYXRjaFsxXSkgfHwgMDtcbiAgICAgICAgICAgIHJlc3VsdC50aWx0ID0gcGFyc2VGbG9hdChwYW5UaWx0TWF0Y2hbMl0pIHx8IDA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IFpvb20gdmVsb2NpdHlcbiAgICAgICAgY29uc3Qgem9vbU1hdGNoID0gYm9keS5tYXRjaCgvWm9vbVtePl0qeD1cIihbXlwiXSopXCIvaSk7XG4gICAgICAgIGlmICh6b29tTWF0Y2gpIHtcbiAgICAgICAgICAgIHJlc3VsdC56b29tID0gcGFyc2VGbG9hdCh6b29tTWF0Y2hbMV0pIHx8IDA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgZXh0cmFjdFBUWlRyYW5zbGF0aW9uKGJvZHk6IHN0cmluZyk6IFBUWkNvbW1hbmQge1xuICAgICAgICByZXR1cm4gdGhpcy5leHRyYWN0UFRaVmVsb2NpdHkoYm9keSk7IC8vIFNhbWUgZm9ybWF0XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0UFRaUG9zaXRpb24oYm9keTogc3RyaW5nKTogUFRaQ29tbWFuZCB7XG4gICAgICAgIHJldHVybiB0aGlzLmV4dHJhY3RQVFpWZWxvY2l0eShib2R5KTsgLy8gU2FtZSBmb3JtYXRcbiAgICB9XG5cbiAgICAvLyBXUy1EaXNjb3ZlcnlcbiAgICBwcml2YXRlIGFzeW5jIHN0YXJ0RGlzY292ZXJ5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0ID0gZGdyYW0uY3JlYXRlU29ja2V0KHsgdHlwZTogJ3VkcDQnLCByZXVzZUFkZHI6IHRydWUgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUuZXJyb3IoJ1tPTlZJRiBTZXJ2ZXJdIERpc2NvdmVyeSBlcnJvcjonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQub24oJ21lc3NhZ2UnLCAobXNnLCByaW5mbykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBtc2cudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnUHJvYmUnKSAmJiBtZXNzYWdlLmluY2x1ZGVzKCdOZXR3b3JrVmlkZW9UcmFuc21pdHRlcicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRiBTZXJ2ZXJdIERpc2NvdmVyeSBwcm9iZSBmcm9tICR7cmluZm8uYWRkcmVzc306JHtyaW5mby5wb3J0fWApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRQcm9iZU1hdGNoKHJpbmZvLmFkZHJlc3MsIHJpbmZvLnBvcnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyeVNvY2tldC5iaW5kKDM3MDIsICcwLjAuMC4wJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzY292ZXJ5U29ja2V0IS5hZGRNZW1iZXJzaGlwKCcyMzkuMjU1LjI1NS4yNTAnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnNvbGUubG9nKCdbT05WSUYgU2VydmVyXSBXUy1EaXNjb3ZlcnkgbGlzdGVuaW5nIG9uIDIzOS4yNTUuMjU1LjI1MDozNzAyJyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2VuZFByb2JlTWF0Y2goYWRkcmVzczogc3RyaW5nLCBwb3J0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZUlkID0gYHVybjp1dWlkOiR7dGhpcy5nZW5lcmF0ZVVVSUQoKX1gO1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gYGh0dHA6Ly8ke3RoaXMuY29uZmlnLmlwQWRkcmVzc306JHt0aGlzLmNvbmZpZy5odHRwUG9ydH1gO1xuXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHNvYXA6RW52ZWxvcGUgeG1sbnM6c29hcD1cImh0dHA6Ly93d3cudzMub3JnLzIwMDMvMDUvc29hcC1lbnZlbG9wZVwiXG4gICAgICAgICAgICAgICB4bWxuczp3c2E9XCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA0LzA4L2FkZHJlc3NpbmdcIlxuICAgICAgICAgICAgICAgeG1sbnM6d3NkPVwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNC9kaXNjb3ZlcnlcIlxuICAgICAgICAgICAgICAgeG1sbnM6ZG49XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9uZXR3b3JrL3dzZGxcIj5cbiAgICA8c29hcDpIZWFkZXI+XG4gICAgICAgIDx3c2E6TWVzc2FnZUlEPiR7bWVzc2FnZUlkfTwvd3NhOk1lc3NhZ2VJRD5cbiAgICAgICAgPHdzYTpUbz5odHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA0LzA4L2FkZHJlc3Npbmcvcm9sZS9hbm9ueW1vdXM8L3dzYTpUbz5cbiAgICAgICAgPHdzYTpBY3Rpb24+aHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNC9kaXNjb3ZlcnkvUHJvYmVNYXRjaGVzPC93c2E6QWN0aW9uPlxuICAgIDwvc29hcDpIZWFkZXI+XG4gICAgPHNvYXA6Qm9keT5cbiAgICAgICAgPHdzZDpQcm9iZU1hdGNoZXM+XG4gICAgICAgICAgICA8d3NkOlByb2JlTWF0Y2g+XG4gICAgICAgICAgICAgICAgPHdzYTpFbmRwb2ludFJlZmVyZW5jZT5cbiAgICAgICAgICAgICAgICAgICAgPHdzYTpBZGRyZXNzPnVybjp1dWlkOiR7dGhpcy5jb25maWcuc2VyaWFsTnVtYmVyfTwvd3NhOkFkZHJlc3M+XG4gICAgICAgICAgICAgICAgPC93c2E6RW5kcG9pbnRSZWZlcmVuY2U+XG4gICAgICAgICAgICAgICAgPHdzZDpUeXBlcz5kbjpOZXR3b3JrVmlkZW9UcmFuc21pdHRlcjwvd3NkOlR5cGVzPlxuICAgICAgICAgICAgICAgIDx3c2Q6U2NvcGVzPlxuICAgICAgICAgICAgICAgICAgICBvbnZpZjovL3d3dy5vbnZpZi5vcmcvdHlwZS92aWRlb19lbmNvZGVyXG4gICAgICAgICAgICAgICAgICAgIG9udmlmOi8vd3d3Lm9udmlmLm9yZy90eXBlL3B0elxuICAgICAgICAgICAgICAgICAgICBvbnZpZjovL3d3dy5vbnZpZi5vcmcvUHJvZmlsZS9TdHJlYW1pbmdcbiAgICAgICAgICAgICAgICAgICAgb252aWY6Ly93d3cub252aWYub3JnL25hbWUvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuZGV2aWNlTmFtZSl9XG4gICAgICAgICAgICAgICAgICAgIG9udmlmOi8vd3d3Lm9udmlmLm9yZy9oYXJkd2FyZS8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5tb2RlbCl9XG4gICAgICAgICAgICAgICAgPC93c2Q6U2NvcGVzPlxuICAgICAgICAgICAgICAgIDx3c2Q6WEFkZHJzPiR7YmFzZVVybH0vb252aWYvZGV2aWNlX3NlcnZpY2U8L3dzZDpYQWRkcnM+XG4gICAgICAgICAgICAgICAgPHdzZDpNZXRhZGF0YVZlcnNpb24+MTwvd3NkOk1ldGFkYXRhVmVyc2lvbj5cbiAgICAgICAgICAgIDwvd3NkOlByb2JlTWF0Y2g+XG4gICAgICAgIDwvd3NkOlByb2JlTWF0Y2hlcz5cbiAgICA8L3NvYXA6Qm9keT5cbjwvc29hcDpFbnZlbG9wZT5gO1xuXG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHJlc3BvbnNlKTtcbiAgICAgICAgdGhpcy5kaXNjb3ZlcnlTb2NrZXQ/LnNlbmQoYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBwb3J0LCBhZGRyZXNzLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25zb2xlLmVycm9yKCdbT05WSUYgU2VydmVyXSBGYWlsZWQgdG8gc2VuZCBwcm9iZSBtYXRjaDonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uc29sZS5sb2coYFtPTlZJRiBTZXJ2ZXJdIFNlbnQgcHJvYmUgbWF0Y2ggdG8gJHthZGRyZXNzfToke3BvcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFV0aWxpdHkgbWV0aG9kc1xuICAgIHByaXZhdGUgd3JhcFNvYXBSZXNwb25zZShjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPHNvYXA6RW52ZWxvcGUgeG1sbnM6c29hcD1cImh0dHA6Ly93d3cudzMub3JnLzIwMDMvMDUvc29hcC1lbnZlbG9wZVwiXG4gICAgICAgICAgICAgICB4bWxuczp0ZHM9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9kZXZpY2Uvd3NkbFwiXG4gICAgICAgICAgICAgICB4bWxuczp0cnQ9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIxMC9tZWRpYS93c2RsXCJcbiAgICAgICAgICAgICAgIHhtbG5zOnRwdHo9XCJodHRwOi8vd3d3Lm9udmlmLm9yZy92ZXIyMC9wdHovd3NkbFwiXG4gICAgICAgICAgICAgICB4bWxuczp0dD1cImh0dHA6Ly93d3cub252aWYub3JnL3ZlcjEwL3NjaGVtYVwiPlxuICAgIDxzb2FwOkJvZHk+XG4gICAgICAgICR7Y29udGVudC50cmltKCl9XG4gICAgPC9zb2FwOkJvZHk+XG48L3NvYXA6RW52ZWxvcGU+YDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZVNvYXBGYXVsdChjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG48c29hcDpFbnZlbG9wZSB4bWxuczpzb2FwPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMy8wNS9zb2FwLWVudmVsb3BlXCI+XG4gICAgPHNvYXA6Qm9keT5cbiAgICAgICAgPHNvYXA6RmF1bHQ+XG4gICAgICAgICAgICA8c29hcDpDb2RlPlxuICAgICAgICAgICAgICAgIDxzb2FwOlZhbHVlPnNvYXA6JHtjb2RlfTwvc29hcDpWYWx1ZT5cbiAgICAgICAgICAgIDwvc29hcDpDb2RlPlxuICAgICAgICAgICAgPHNvYXA6UmVhc29uPlxuICAgICAgICAgICAgICAgIDxzb2FwOlRleHQgeG1sOmxhbmc9XCJlblwiPiR7bWVzc2FnZX08L3NvYXA6VGV4dD5cbiAgICAgICAgICAgIDwvc29hcDpSZWFzb24+XG4gICAgICAgIDwvc29hcDpGYXVsdD5cbiAgICA8L3NvYXA6Qm9keT5cbjwvc29hcDpFbnZlbG9wZT5gO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpO1xuICAgICAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=

/***/ },

/***/ "crypto"
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("crypto");

/***/ },

/***/ "dgram"
/*!************************!*\
  !*** external "dgram" ***!
  \************************/
(module) {

"use strict";
module.exports = require("dgram");

/***/ },

/***/ "events"
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("events");

/***/ },

/***/ "fs"
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
(module) {

"use strict";
module.exports = require("fs");

/***/ },

/***/ "http"
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
(module) {

"use strict";
module.exports = require("http");

/***/ },

/***/ "module"
/*!*************************!*\
  !*** external "module" ***!
  \*************************/
(module) {

"use strict";
module.exports = require("module");

/***/ },

/***/ "net"
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
(module) {

"use strict";
module.exports = require("net");

/***/ },

/***/ "os"
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
(module) {

"use strict";
module.exports = require("os");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	var __webpack_export_target__ = (exports = typeof exports === "undefined" ? {} : exports);
/******/ 	for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;

//# sourceURL=/plugin/main.nodejs.js
//# sourceMappingURL=main.nodejs.js.map