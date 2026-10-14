export class PropertyProvider {
  constructor({ name }) {
    this.name = name;
  }

  async resolveProperty() {
    throw new Error('resolveProperty() must be implemented by PropertyProvider subclasses.');
  }
}
