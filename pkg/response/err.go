package response

type ErrorResponse struct {
	Error string `json:"error"`
}

func InternalServerError() ErrorResponse {
	return ErrorResponse{Error: "Internal Server Error"}
}

func Error(err error) ErrorResponse {
	return ErrorResponse{Error: err.Error()}
}
