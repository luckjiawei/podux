package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2245327697")
		if err != nil {
			return err
		}

		// add integrationId field (relation to fh_integrations)
		if err := collection.Fields.AddMarshaledJSONAt(14, []byte(`{
			"cascadeDelete": false,
			"collectionId": "pbc_1339991802",
			"hidden": false,
			"id": "relation3461722399",
			"maxSelect": 1,
			"minSelect": 0,
			"name": "integrationId",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "relation"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2245327697")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById("relation3461722399")

		return app.Save(collection)
	})
}
