export class ProtocolAdapter {
  constructor(name) { this.name = name }
  normalize(payload) { throw new Error('normalize() must be implemented') }
  simulate() { return this.normalize({ deviceId: `${this.name.toLowerCase()}-sim-01`, metric: 'temperature', value: 21.5, recordedAt: new Date().toISOString() }) }
}
export class MqttAdapter extends ProtocolAdapter {
  constructor() { super('MQTT') }
  normalize(payload) { return { deviceId: payload.deviceId || payload.topic, metric: payload.metric || payload.name, value: Number(payload.value), recordedAt: payload.recordedAt || new Date().toISOString(), protocol: this.name } }
}
export class LoRaWanAdapter extends ProtocolAdapter {
  constructor() { super('LoRaWAN') }
  normalize(payload) { return { deviceId: payload.deviceId || payload.devEui, metric: payload.metric || 'temperature', value: Number(payload.value ?? payload.data), recordedAt: payload.recordedAt || new Date().toISOString(), protocol: this.name } }
}
export class BacnetAdapter extends ProtocolAdapter {
  constructor() { super('BACnet/IP') }
  normalize(payload) { return { deviceId: payload.deviceId || payload.objectId, metric: payload.metric || payload.objectType, value: Number(payload.value), recordedAt: payload.recordedAt || new Date().toISOString(), protocol: this.name } }
}
export class ModbusAdapter extends ProtocolAdapter {
  constructor() { super('Modbus') }
  normalize(payload) { return { deviceId: payload.deviceId || `unit-${payload.unitId}`, metric: payload.metric || `register-${payload.register}`, value: Number(payload.value), recordedAt: payload.recordedAt || new Date().toISOString(), protocol: this.name } }
}
export const adapters = { mqtt: new MqttAdapter(), lorawan: new LoRaWanAdapter(), bacnet: new BacnetAdapter(), modbus: new ModbusAdapter() }
