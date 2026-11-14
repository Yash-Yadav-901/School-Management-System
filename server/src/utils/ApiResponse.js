class ApiResponse {
  constructor(statusCode, data, message = 'success') {
    this.statusCode = statusCode;
    this.statusCoded = statusCode; // support both statusCode and statusCoded
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export { ApiResponse };

