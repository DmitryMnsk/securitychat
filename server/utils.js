module.exports = {
    serializer: serializer
};

function serializer(data) {
    let query = JSON.stringify(data.query);
    let options = JSON.stringify(data.options || {});

    return `db.${data.coll}.${data.method}(${query}, ${options});`;
}