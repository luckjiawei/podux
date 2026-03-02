package types

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

// NullableInt is a custom type for nullable int that can handle empty strings
type NullableInt struct {
	Int   int
	Valid bool // Valid is true if Int is not NULL
}

// Scan implements sql.Scanner interface
func (n *NullableInt) Scan(value interface{}) error {
	if value == nil {
		n.Valid = false
		n.Int = 0
		return nil
	}

	switch v := value.(type) {
	case int64:
		n.Int = int(v)
		n.Valid = true
		return nil
	case int:
		n.Int = v
		n.Valid = true
		return nil
	case string:
		if v == "" {
			n.Valid = false
			n.Int = 0
			return nil
		}
		// Try to parse string to int
		var i int
		_, err := fmt.Sscanf(v, "%d", &i)
		if err != nil {
			n.Valid = false
			n.Int = 0
			return nil
		}
		n.Int = i
		n.Valid = true
		return nil
	default:
		n.Valid = false
		n.Int = 0
		return nil
	}
}

// Value implements driver.Valuer interface
func (n NullableInt) Value() (driver.Value, error) {
	if !n.Valid {
		return nil, nil
	}
	return int64(n.Int), nil
}

// MarshalJSON implements json.Marshaler interface
func (n NullableInt) MarshalJSON() ([]byte, error) {
	if !n.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(n.Int)
}

// UnmarshalJSON implements json.Unmarshaler interface
func (n *NullableInt) UnmarshalJSON(data []byte) error {
	if string(data) == "null" || string(data) == "\"\"" {
		n.Valid = false
		n.Int = 0
		return nil
	}
	var i int
	if err := json.Unmarshal(data, &i); err != nil {
		n.Valid = false
		n.Int = 0
		return nil
	}
	n.Int = i
	n.Valid = true
	return nil
}

// JSONStringArray is a custom type for []string that can be scanned from JSON
type JSONStringArray []string

// Scan implements sql.Scanner interface
func (j *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*j = []string{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}

	var arr []string
	if err := json.Unmarshal(bytes, &arr); err != nil {
		return err
	}

	*j = arr
	return nil
}

// Value implements driver.Valuer interface
func (j JSONStringArray) Value() (driver.Value, error) {
	if j == nil {
		return "[]", nil
	}
	bytes, err := json.Marshal(j)
	return string(bytes), err
}

// JSONMap is a custom type for map[string]interface{} that can be scanned from JSON
type JSONMap map[string]interface{}

// Scan implements sql.Scanner interface
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = map[string]interface{}{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}

	var m map[string]interface{}
	if err := json.Unmarshal(bytes, &m); err != nil {
		return err
	}

	*j = m
	return nil
}

// Value implements driver.Valuer interface
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	bytes, err := json.Marshal(j)
	return string(bytes), err
}
