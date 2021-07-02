import React from "react"
import { render } from "react-dom"
import { Button, Form } from 'antd'
import styled from 'styled-components'

import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useMutation,
  gql
} from "@apollo/client"

import './index.css'

const serverURL = 'http://localhost:4000'

const client = new ApolloClient({
  uri: serverURL,
  cache: new InMemoryCache()
})

const ADD_TODO = gql`
  mutation AddTodo($description: String!) {
    addTodo(description: $description) {
      id
      description
    }
  }
`
const Contaier = styled.div`
  width: 100vw;
  height: 100vh;
  overflow-y: scroll;
  padding: 20px;
`
const Title = styled.h1`
  font-size: 36px;
  font-weight: bold;
  color: #000;
`


function AddTodo() {
  let input
  const [addTodo] = useMutation(ADD_TODO, {
    update(
      cache,
      {
        data: { addTodo }
      }
    ) {
      cache.modify({
        fields: {
          todos(existingTodos = []) {
            const newTodoRef = cache.writeFragment({
              data: addTodo,
              fragment: gql`
                fragment NewTodo on Todo {
                  id
                  description
                }
              `
            })
            return existingTodos.concat(newTodoRef)
          }
        }
      })
    }
  })

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault()
          addTodo({
            variables: { description: input.value },

            // list before the server responds
            optimisticResponse: {
              addTodo: {
                id: 'temp-id',
                __typename: "Todo",
                description: input.value
              }
            }
          })
          input.value = ""
        }}
      >
        <Form.Item
          label="任務描述"
          name="description"
        >
          <input
            ref={node => {
              input = node
            }}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit">新增 Todo</Button>
      </form>
    </div>
  )
}

const GET_TODOS = gql`
  {
    todos {
      id
      description
    }
  }
`

const UPDATE_TODO = gql`
  mutation UpdateTodo($id: String!, $description: String!) {
    updateTodo(id: $id, description: $description) {
      id
      description
    }
  }
`

const DELETE_TODO = gql`
  mutation DeleteTodo($id: String!) {
    deleteTodo(id: $id) {
      id
    }
  }
`

function Todos() {
  const { loading, error, data } = useQuery(GET_TODOS)
  const [
    updateTodo,
    { loading: updateLoading, error: updateError }
  ] = useMutation(UPDATE_TODO)

  const [deleteTodo, {
    loading: deleteLoading, error: deleteError
  }] = useMutation(DELETE_TODO, {
    update(
      cache,
      {
        data: { deleteTodo }
      }
    ) {
      cache.modify({
        fields: {
          todos(existingTodos = []) {
            console.log(existingTodos, 'first')
            console.log(existingTodos.filter(todo => todo.id != deleteTodo.id), 'second')
            return existingTodos.filter(todo => todo.__ref !== `Todo:${deleteTodo.id}`)
          }
        }
      })
    }
  })

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  const todos = data.todos.map(({ id, description }) => {
    let input

    return (
      <li key={id}>
        <h2>任務描述：{description}</h2>
        <form
          onSubmit={e => {
            e.preventDefault()
            console.log(e.target, 'event')
            updateTodo({ variables: { id, description: input.value } })
            input.value = ""
          }}
        >
          <input
            placeholder="更新任務描述"
            style={{ marginRight: '10px' }}
            ref={node => {
              input = node
            }}
          />
          <Button style={{ marginRight: '10px' }} type="primary" htmlType="submit" ghost>更新 Todo</Button>
          <Button type="danger" htmlType="button" ghost onClick={() => deleteTodo({ variables: { id } })}>刪除 Todo</Button>
        </form>
      </li>
    )
  })

  return (
    <div>
      <ul>{todos}</ul>
      {(updateLoading || deleteLoading) && <p>Loading...</p>}
      {updateError && <p>Error: {updateError.message}</p>}
      {deleteError && <p>Error: {deleteError.message}</p>}
    </div>
  )
}

function App() {
  return (
    <ApolloProvider client={client}>
      <Contaier>
        <Title>TO-DO List</Title>
        <AddTodo />
        <hr />
        <Todos />
      </Contaier>
    </ApolloProvider>
  )
}

render(<App />, document.getElementById("root"))
