import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cartiaApi } from '../frontend/src/api.js';

test('saving an edited dish sends its current fields without stale cents or upload files', async (t) => {
  let submitted;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    submitted = { url, ...options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ ok: true, dish: submitted.body }) };
  });
  const dish = { databaseId: 'dish-a', name: 'Salmón', detail: 'Con arvejas', price: '$18.900', priceCents: 100, categoryId: 'category-b', badge: 'Favorito', available: false, imageFile: {}, videoFile: {} };
  const result = await cartiaApi.saveDish(dish, 'csrf-test');
  assert.equal(submitted.url, '/api/v1/dishes/save');
  assert.equal(submitted.headers['X-CSRF-Token'], 'csrf-test');
  assert.deepEqual(submitted.body, { databaseId: 'dish-a', name: 'Salmón', detail: 'Con arvejas', price: '$18.900', categoryId: 'category-b', badge: 'Favorito', available: false });
  assert.equal(result.dish.price, '$18.900');
  assert.equal(dish.priceCents, 100);
});

test('saving a cents-only dish preserves its explicit price', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(JSON.parse(options.body).priceCents, 12500);
    return { ok: true, json: async () => ({ ok: true }) };
  });
  await cartiaApi.saveDish({ name: 'Plato', priceCents: 12500 }, 'csrf-test');
});
