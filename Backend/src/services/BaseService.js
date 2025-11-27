class BaseService {
  constructor(model) {
    this.model = model;
  }

  async findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  async findAll(options = {}) {
    return this.model.findAll(options);
  }

  async create(payload, options = {}) {
    return this.model.create(payload, options);
  }

  async updateById(id, payload, options = {}) {
    const instance = await this.findById(id, options);
    if (!instance) return null;
    await instance.update(payload, options);
    return instance;
  }

  async deleteById(id, options = {}) {
    const instance = await this.findById(id, options);
    if (!instance) return null;
    await instance.destroy(options);
    return instance;
  }
}

export default BaseService;
