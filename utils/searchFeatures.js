class SearchFeatures {
    constructor(query, queryString) {
        this.query = query
        this.queryString = queryString
    }

    search() {
        const keyword = this.queryString.keyword ? {
            name: {
                $regex: this.queryString.keyword,
                $options: "i",
            }
        } : {};

        // console.log(keyword);

        this.query = this.query.find({ ...keyword });
        return this;
    }

    filter() {
        const queryCopy = { ...this.queryString }

        const removeFields = ["keyword", "page", "limit"];
        removeFields.forEach(key => delete queryCopy[key]);

        // Handle subCategory filter separately
        if (queryCopy.subCategory) {
            const subCat = queryCopy.subCategory;
            delete queryCopy.subCategory;
            delete queryCopy.category;
            let queryString = JSON.stringify(queryCopy);
            queryString = queryString.replace(/\b(gt|gte|lt|lte)\b/g, key => `$${key}`);
            this.query = this.query.find({ ...JSON.parse(queryString), subCategory: subCat });
        } else {
            let queryString = JSON.stringify(queryCopy);
            queryString = queryString.replace(/\b(gt|gte|lt|lte)\b/g, key => `$${key}`);
            this.query = this.query.find(JSON.parse(queryString));
        }

        return this;
    }

    pagination(resultPerPage) {
        const currentPage = Number(this.queryString.page) || 1;

        const skipProducts = resultPerPage * (currentPage - 1);

        this.query = this.query.limit(resultPerPage).skip(skipProducts);
        return this;
    }
};

module.exports = SearchFeatures;