const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const isDateValid = require("date-fns/isValid");
var parseISO = require('date-fns/parseISO');
var format = require('date-fns/format');

var isMatch = require('date-fns/isMatch')

const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async (request, response) => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/");
        });

    } catch(e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

module.exports = app;

// REUSABLE FUNCTIONS For Properties Check
const hasStatusProperty = (requestQuery) => {
    return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
    return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperties = (requestQuery) => {
    return (
        requestQuery.priority !== undefined && requestQuery.status !== undefined
    );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
    return (
        requestQuery.category !== undefined && requestQuery.status !== undefined
    );
};

const hasCategoryProperty = (requestQuery) => {
    return (
        requestQuery.category !== undefined
    );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
    return (
        requestQuery.category !== undefined && requestQuery.property !== undefined
    );
};

// REUSABLE FUNCTIONS For Property Validation Check
const isCategoryValid = (requestQuery) => {
    if (requestQuery.category === "HOME" || requestQuery.category === "WORK" || requestQuery.category === "LEARNING") {
        return true;
    } else {
        return false;
    }    
}

const isPriorityValid = (requestQuery) => {
    if (requestQuery.priority === "MEDIUM" || requestQuery.priority === "HIGH" || requestQuery.priority === "LOW") {
        return true;
    } else {
        return false;
    }    
}

const isStatusValid = (requestQuery) => {
    if (requestQuery.status === "TO DO" || requestQuery.status === "IN PROGRESS" || requestQuery.status === "DONE") {
        return true;
    } else {
        return false;
    }    
}

// REUSABLE FUNCTION for Object Conversion 
const convertDBObjectToResponseObject = (dbObject) => {
    return {
        id: dbObject.id,
        todo: dbObject.todo,
        priority: dbObject.priority,
        status: dbObject.status,
        category: dbObject.category,
        dueDate: dbObject.due_date
    };
};

// ***************************   API CALLS   *********************************************************************

// API 1 - GET Scenario 1 - Returns a list of all todos where different properties and values
app.get("/todos/", async (request, response) => {
    let getTodosQuery = "";
    let invalidTodoMsg = undefined;
    const { search_q = "", category, priority, status } = request.query;

    switch (true) {
        case hasStatusProperty(request.query):            
            if (isStatusValid(request.query) === false) {
                invalidTodoMsg = "Status";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND status = '${status}';`;
            }
            break;
        case hasPriorityProperty(request.query):
            if (isPriorityValid(request.query) === false) {
                invalidTodoMsg = "Priority";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND priority = '${priority}';`;                
            }            
            break;
        case hasPriorityAndStatusProperties(request.query):
            if (isPriorityValid(request.query) === false) {
                invalidTodoMsg = "Priority";
            } else if (isStatusValid(request.query) === false) {
                invalidTodoMsg = "Status";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND status = '${status}'
                        AND priority = '${priority}';`;
            }
            break;
        case hasCategoryAndStatusProperties(request.query):
            if (isCategoryValid(request.query) === false) {
                invalidTodoMsg = "Category";
            } else if (isStatusValid(request.query) === false) {
                invalidTodoMsg = "Status";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND category = '${category}'
                        AND status = '${status}';`;
            }            
            break;
        case hasCategoryProperty(request.query):
            if (isCategoryValid(request.query) === false) {
                invalidTodoMsg = "Category";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND category = '${category}';`;
            }            
            break;
        case hasCategoryAndPriorityProperties(request.query):
            if (isCategoryValid(request.query) === false) {
                invalidTodoMsg = "Category";
            } else if (isPriorityValid(request.query) === false) {
                invalidTodoMsg = "Priority";
            } else {
                getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND category = '${category}'
                        AND property = '${property}';`;
            }
            break;
        default:
            getTodosQuery = `
                SELECT
                    *
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%';`;
    };

    if (invalidTodoMsg === undefined) {
        const data = await db.all(getTodosQuery);
        response.send(data.map( (eachObject) =>
            convertDBObjectToResponseObject(eachObject)
        ));
    } else {
        response.status(400);
        response.send(`Invalid Todo ${invalidTodoMsg}`);
    }
});

// API 2 - GET Returns a specific todo based on the todo ID
app.get("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    const getATodoQuery = `
        SELECT 
            *
        FROM 
            todo
        WHERE 
            id = ${todoId};`;
    
    const getATodo = await db.get(getATodoQuery);
    response.send( convertDBObjectToResponseObject(getATodo) );
});

// API 3 - GET Returns a list of all todos with a specific due date in the query parameter
app.get("/agenda/", async (request, response) => {
    const { date } = request.query;
    
    if (isMatch(date, "yyyy-MM-dd") === true) {
        const newDate = format(new Date(date), "yyyy-MM-dd");
        const getATodoQuery = `
            SELECT 
                *
            FROM 
                todo 
            WHERE
                due_date = '${newDate}';`;
        
        const dbResponse = await db.all(getATodoQuery);
        response.send( dbResponse.map( (eachObject) => 
            convertDBObjectToResponseObject(eachObject)
        )
        );
    } else {
        response.status(400);
        response.send("Invalid Due Date");
    }
});

// API 4 - POST Create a todo in the todo table
app.post("/todos/", async (request, response) => {
    let invalidProperty = undefined;
    let createTodoQuery = "";

    const { id, todo, priority, status, category, dueDate } = request.body;

    if (isPriorityValid(request.body) === false) {
        invalidProperty = "Todo Priority";
    } else if (isStatusValid(request.body) === false) {
        invalidProperty = "Todo Status";
    } else if (isCategoryValid(request.body) === false) {
        invalidProperty = "Todo Category";
    } else if (isMatch(dueDate, "yyyy-MM-dd") === false) {
        invalidProperty = "Due Date";
    } else {
        const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        createTodoQuery = `
            INSERT INTO 
                todo (id, todo, priority, status, category, due_date )
            VALUES (
                ${id},
                '${todo}',
                '${priority}',
                '${status}',
                '${category}',
                '${newDueDate}'
            );`;
    }

    if (invalidProperty === undefined) {
        await db.run(createTodoQuery);
        response.send("Todo Successfully Added");
    } else {
        response.status(400);
        response.send(`Invalid ${invalidProperty}`);
    }
});

// API 5 - PUT Updates the details of a specific todo based on the todo ID
app.put("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    let updatingColumn = "";
    let invalidProperty = undefined;

    const todoDetails = request.body;

    switch (true) {
        case todoDetails.status !== undefined:
            if (isStatusValid(request.body) === true){
                updatingColumn = "Status";
            } else {
                invalidProperty = "Todo Status";
            }
            break;
        case todoDetails.priority !== undefined:
            if (isPriorityValid(request.body) === true){
                updatingColumn = "Priority";
            } else {
                invalidProperty = "Todo Priority";
            }
            break;
        case todoDetails.todo !== undefined:
            updatingColumn = "Todo";
            break;
        case todoDetails.category !== undefined:
            if (isCategoryValid(request.body) === true) {
                updatingColumn = "Category";
            } else {
                invalidProperty = "Todo Category";
            }
            break;
        case todoDetails.dueDate !== undefined:
            if (isDateValid(parseISO(todoDetails.dueDate)) === true) {
                updatingColumn = "Due Date";
            } else {
                invalidProperty = "Due Date";
            }
            break;
    };

    const previousTodoQuery = `
        SELECT
            *
        FROM 
            todo
        WHERE 
            id = ${todoId};`;
    
    const previousTodo = await db.get(previousTodoQuery);

    const {
        todo = previousTodo.todo, 
        priority = previousTodo.priority, 
        status = previousTodo.status,
        category = previousTodo.category,
        dueDate = previousTodo.due_date
    } = request.body;

    const updateTodoQuery = `
        UPDATE 
            todo 
        SET
            todo = '${todo}',
            priority = '${priority}',
            status = '${status}',
            category = '${category}',
            due_date = '${dueDate}'
        WHERE 
            id = ${todoId};`;
    
    if (invalidProperty === undefined) {
        await db.run(updateTodoQuery);
        response.send(`${updatingColumn} Updated`);
    } else {
        response.status(400);
        response.send(`Invalid ${invalidProperty}`);
    }
});

// API - 6 DELETE Deletes a todo from the todo table based on the todo ID
app.delete("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;

    const deleteTodoQuery = `
        DELETE FROM 
            todo 
        WHERE
            id = ${todoId};`;
    
    await db.run(deleteTodoQuery);
    response.send("Todo Deleted");
});