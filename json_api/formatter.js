class self {

}
module.exports = self;
const R = require('ramda');
const isEmpty = require('lodash/isEmpty');
const Result = require('folktale/result');
const { keepIncludedIfRequest } = require('./included_prop');
const { validateParameters } = require('../parameter/validate');
const { getErrorType } = require('./utils');
const { pipeAwait } = require('../ramda/pipe');
/**
 * Serializing data to JSONAPI format
 * @param  {string|string[]} include - the properties that be included in included property
 * @param  {import('./typedefs').JsonApiRegister} jsonApiRegister
 * @param  {import('./typedefs').JsonApiSerializer} jsonApiSerializer
 * @param  {import('./typedefs').Type} options.type  - json-api-serializer's type
 * @param  {any} options.extraData - json-api-serializer' extraData
 * @param  {Object|Object[]} data  - the data to convert
 * @return {Object|Object[]}
 */
const handleSerializeToJsonApi = R.curry(
  (
    include,
    jsonApiSerializer,
    { type, extraData },
    data,
  ) => {
    const serializedData = jsonApiSerializer.serialize(type, data, extraData);
    return keepIncludedIfRequest(include, serializedData);
  },
);
/**
 * Serializing data to JSONAPI format and wrap it in foltale/result
 * @param  {string|string[]} include - the properties that be included in included property
 * @param  {import('./typedefs').JsonApiRegister} jsonApiRegister
 * @param  {import('./typedefs').JsonApiSerializer} jsonApiSerializer
 * @param  {import('./typedefs').Type} options.type
 * @param  {any} options.extraData - json-api-serializer' extraData
 * @param  {Object|Object[]} data  - the data to convert
 * @return {Object|Object[]}
 */
const createSerializeToJsonApi = R.curry(
  (
    config,
    include,
    jsonApiSerializer,
    { type, extraData },
    dataResult,
  ) => dataResult.chain(
    (data) => {
      const typeErrors = validateParameters(
        {
          config, jsonApiSerializer, type, extraData, data,
        },
        ['object', 'object', 'string', '*', 'object|array'],
      );
      const { useGenericError } = config;
      if (!isEmpty(typeErrors)) return Result.Error(getErrorType(useGenericError, 'badData', typeErrors));
      if (isEmpty(data)) {
        return Result.Error(
          getErrorType(useGenericError, 'notFound', 'JSONAPI: No data provided'),
        );
      }
      if (isEmpty(type)) {
        return Result.Error(getErrorType(
          useGenericError,
          'badData',
          'type property not found in {type, extraData}',
        ));
      }
      return Result.Ok(
        handleSerializeToJsonApi(
          include,
          jsonApiSerializer,
          { type, extraData },
          data,
        ),
      );
    },
  ),
);
const serializeToJsonApiGenericError = createSerializeToJsonApi({ useGenericError: true });
const serializeToJsonApiBoomError = createSerializeToJsonApi({ useGenericError: false });
/**
 * deserialize data into json api
 * @param  {import('./typedefs').DeserializeConfig} config
 * @param  {import('./typedefs').Type} type
 * @param  {import('./typedefs').JsonApiData} jsonApiData
 * @return {import('./typedefs').JsonApiData} deserialized json api
 */
const handleDeserializeJsonApi = R.curry(
  (jsonApiSerializer, type, jsonApiData) => {
    const deserializedData = jsonApiSerializer.deserialize(type, jsonApiData);
    return Result.Ok(deserializedData);
  },
);
/**
 * Deserialize jsonapi
 * @param  {import('./typedefs').DeserializeConfig} config
 * @param  {import('./typedefs').JsonApiRegister} jsonApiRegister
 * @param  {import('./typedefs').Type} type
 * @param  {import('./typedefs').JsonApiData} jsonApiData
 * @return {import('./typedefs').JsonApiData | import('./typedefs').JsonApiData
 * & import('../folktale/typedefs').FolktaleResult } jsonApiDataResult
 */
const deserializeJsonApi = R.curry(
  (config, jsonApiSerializer, type, jsonApiData) => {
    const typeErrors = validateParameters(
      {
        config, jsonApiSerializer, type, jsonApiData,
      },
      ['object', 'object', 'string', 'object|array'],
    );
    const { useGenericError } = config;
    if (!isEmpty(typeErrors)) return Result.Error(getErrorType(useGenericError, 'badData', typeErrors));

    if (!Result.hasInstance(jsonApiData)) {
      return handleDeserializeJsonApi(jsonApiSerializer, type, jsonApiData);
    }
    return jsonApiData.chain(
      (data) => handleDeserializeJsonApi(jsonApiSerializer, type, jsonApiData),
    );
  },
);

const deserializeJsonApiGenericError = deserializeJsonApi({ useGenericError: true });
const deserializeJsonApiBoomError = deserializeJsonApi({ useGenericError: false });
/**
 * deserialize data  async into json api
 * @param  {import('./typedefs').DeserializeConfig} config
 * @param  {import('./typedefs').Type} type
 * @param  {import('./typedefs').JsonApiData} jsonApiData
 * @return {import('./typedefs').JsonApiData} deserialized json api
 */
const handleDeserializeJsonApiAsync = R.curry(
  async (jsonApiSerializer, type, jsonApiData) => {
    const deserializedData = await jsonApiSerializer.deserializeAsync(type, jsonApiData);
    return Result.Ok(deserializedData);
  },
);
/**
 * Deserialize jsonapi async
 * @param  {import('./typedefs').DeserializeConfig} config
 * @param  {import('./typedefs').JsonApiRegister} jsonApiRegister
 * @param  {import('./typedefs').Type} type
 * @param  {import('./typedefs').JsonApiData} jsonApiData
 * @return {import('./typedefs').JsonApiData
 * & import('../folktale/typedefs').FolktaleResult} jsonApiDataResult
 */
const deserializeJsonApiAsync = R.curry(
  async (config, jsonApiSerializer, type, jsonApiData) => {
    const typeErrors = validateParameters(
      {
        config, jsonApiSerializer, type, jsonApiData,
      },
      ['object', 'object', 'string', 'object|array'],
    );
    const { useGenericError } = config;
    if (!isEmpty(typeErrors)) return Result.Error(useGenericError(useGenericError, 'badData', typeErrors));
    if (!Result.hasInstance(jsonApiData)) {
      return handleDeserializeJsonApiAsync(jsonApiSerializer, type, jsonApiData);
    }
    return jsonApiData.chain(
      async (data) => {
        const typeErrors = validateParameters(
          {
            data,
          },
          ['object|array'],
        );
        if (!isEmpty(typeErrors)) return Result.Error(useGenericError(useGenericError, 'badData', typeErrors));
        return handleDeserializeJsonApiAsync(jsonApiSerializer, type, jsonApiData);
      },
    );
  },
);
const deserializeJsonApiGenericErrorAsync = deserializeJsonApiAsync({ useGenericError: true });
const deserializeJsonApiBoomErrorAsync = deserializeJsonApiAsync({ useGenericError: false });

self.createSerializeToJsonApi = createSerializeToJsonApi;
self.serializeToJsonApiGenericError = serializeToJsonApiGenericError;
self.serializeToJsonApiBoomError = serializeToJsonApiBoomError;
self.handleSerializeToJsonApi = handleSerializeToJsonApi;
self.deserializeJsonApi = deserializeJsonApi;
self.deserializeJsonApiAsync = deserializeJsonApiAsync;
self.deserializeJsonApiGenericError = deserializeJsonApiGenericError;
self.deserializeJsonApiBoomError = deserializeJsonApiBoomError;
self.deserializeJsonApiGenericErrorAsync = deserializeJsonApiGenericErrorAsync;
self.deserializeJsonApiBoomErrorAsync = deserializeJsonApiBoomErrorAsync;
