import Ember from 'ember';
import FactoryGuy from '../factory-guy';
import Model from 'ember-data/model';
import MockRequest from './mock-request';
import { isEquivalent } from '../utils/helper-functions';
const assign = Ember.assign || Ember.merge;

class MockGetRequest extends MockRequest {

  constructor(modelName) {
    super(modelName);
    this.responseJson = FactoryGuy.fixtureBuilder.convertForBuild(modelName, {});
    this.validReturnsKeys = [];
    this.queryParams = {};
  }

  /**
   Used for inspecting the repsonse that this mock will generate

   Usually the args will be an attribute like 'id', but it might
   also be a number like 0 or 1 for and index to list types.

   Ideally the responseJson is a JSONProxy class so the logic can be handed off there.
   Otherwise it's a plain object which is rare ( so the logic is not great )

   @param args
   @returns {*}
   */
  get(args) {
    let json = this.responseJson;
    if (json.get) {
      return json.get(args);
    }
    // if this becomes issue, make this search more robust
    return json[args];
  }

  setValidReturnsKeys(validKeys) {
    this.validReturnsKeys = validKeys;
  }

  validateReturnsOptions(options) {
    const responseKeys = Object.keys(options);
    Ember.assert(`[ember-data-factory-guy] You can pass zero or one one output key to 'returns',
                you passed these keys: ${responseKeys}`, responseKeys.length <= 1);

    const [ responseKey ] = responseKeys;
    Ember.assert(`[ember-data-factory-guy] You passed an invalid key for 'returns' function.
      Valid keys are ${this.validReturnsKeys}. You used this key: ${responseKey}`,
      Ember.A(this.validReturnsKeys).contains(responseKey));

    return responseKey;
  }

  returns(options = {}) {
    let responseKey = this.validateReturnsOptions(options);
    this._setReturns(responseKey, options);
    return this;
  }

  _setReturns(responseKey, options) {
    let json, model, models;
    switch (responseKey) {

      case 'id':
         model = FactoryGuy.store.peekRecord(this.modelName, options.id);

        Ember.assert(`argument ( id ) should refer to a model of type ${this.modelName} that is in
         the store. But no ${this.modelName} with id ${options.id} was found in the store`,
          (model instanceof Model && model.constructor.modelName === this.modelName));

        return this.returns({ model });

      case 'model':
        model = options.model;

        Ember.assert(`argument ( model ) must be a Model instance - found type:'
          ${Ember.typeOf(model)}`, (model instanceof Model));

        json = { id: model.id, type: model.constructor.modelName };
        this.responseJson = FactoryGuy.fixtureBuilder.convertForBuild(this.modelName, json);
        break;

      case 'ids':
        const store = FactoryGuy.store;
        models = options.ids.map((id)=> store.peekRecord(this.modelName, id));
        return this.returns({ models });

      case 'models':
        models = options.models;
        Ember.assert(`argument ( models ) must be an array - found type:'
          ${Ember.typeOf(models)}`, Ember.isArray(models));

        json = models.map(function(model) {
          return { id: model.id, type: model.constructor.modelName };
        });

        json = FactoryGuy.fixtureBuilder.convertForBuild(this.modelName, json);
        this.setResponseJson(json);
        break;

      case 'json':
        this.setResponseJson(options.json);
        break;

      case 'attrs':
        let currentId = this.responseJson.get('id');
        let modelParams = assign({id: currentId}, options.attrs);
        json = FactoryGuy.fixtureBuilder.convertForBuild(this.modelName, modelParams);
        this.setResponseJson(json);
        break;

      case 'headers':
        this.addResponseHeaders(options.headers);
        break;
    }
  }

  setResponseJson(json) {
    this.responseJson = json;
  }

  withParams(queryParams) {
    this.queryParams = queryParams;
    return this;
  }

  paramsMatch(settings) {
    if (Ember.$.isEmptyObject(this.queryParams)) {
      return true;
    }
    return isEquivalent(this.queryParams, settings.data);
  }

  extraRequestMatches(settings) {
    return this.paramsMatch(settings);
  }

}

export default MockGetRequest;
