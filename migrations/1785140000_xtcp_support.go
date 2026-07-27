package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		proxies, err := app.FindCollectionByNameOrId("fh_proxies")
		if err != nil {
			return err
		}

		if field, ok := proxies.Fields.GetByName("proxyType").(*core.SelectField); ok {
			found := false
			for _, value := range field.Values {
				if value == "xtcp" {
					found = true
					break
				}
			}
			if !found {
				field.Values = append(field.Values, "xtcp")
			}
		}
		if proxies.Fields.GetByName("secretKey") == nil {
			proxies.Fields.Add(&core.TextField{Name: "secretKey"})
		}
		if proxies.Fields.GetByName("allowUsers") == nil {
			proxies.Fields.Add(&core.JSONField{Name: "allowUsers"})
		}
		if proxies.Fields.GetByName("natTraversal") == nil {
			proxies.Fields.Add(&core.JSONField{Name: "natTraversal"})
		}
		if err := app.Save(proxies); err != nil {
			return err
		}

		if _, err := app.FindCollectionByNameOrId("fh_visitors"); err == nil {
			return nil
		}

		servers, err := app.FindCollectionByNameOrId("fh_servers")
		if err != nil {
			return err
		}
		visitors := core.NewBaseCollection("fh_visitors")
		rule := "@request.auth.id != ''"
		visitors.ListRule = &rule
		visitors.ViewRule = &rule
		visitors.CreateRule = &rule
		visitors.UpdateRule = &rule
		visitors.DeleteRule = &rule
		visitors.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.SelectField{Name: "visitorType", Required: true, MaxSelect: 1, Values: []string{"xtcp"}},
			&core.RelationField{Name: "serverId", Required: true, CollectionId: servers.Id, MaxSelect: 1},
			&core.RelationField{Name: "targetProxyId", CollectionId: proxies.Id, MaxSelect: 1},
			&core.TextField{Name: "serverUser"},
			&core.TextField{Name: "serverName"},
			&core.TextField{Name: "secretKey"},
			&core.TextField{Name: "bindAddr"},
			&core.TextField{Name: "bindPort", Required: true},
			&core.SelectField{Name: "protocol", Required: true, MaxSelect: 1, Values: []string{"quic", "kcp"}},
			&core.JSONField{Name: "transport"},
			&core.BoolField{Name: "keepTunnelOpen"},
			&core.NumberField{Name: "maxRetriesAnHour", OnlyInt: true},
			&core.NumberField{Name: "minRetryInterval", OnlyInt: true},
			&core.JSONField{Name: "natTraversal"},
			&core.SelectField{Name: "status", Required: true, MaxSelect: 1, Values: []string{"enabled", "disabled"}},
			&core.TextField{Name: "description"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		visitors.AddIndex("idx_visitors_server", false, "serverId", "")
		visitors.AddIndex("idx_visitors_target_proxy", false, "targetProxyId", "")
		return app.Save(visitors)
	}, func(app core.App) error {
		return nil
	})
}
