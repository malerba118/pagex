import { NextPage } from "next";

function Contact(props: any) {
  return <h1>contact {props.foo}</h1>;
}

const timeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getServerSideProps = async () => {
  await timeout(1000);
  return { props: { foo: "foo" } };
};

export default Contact;
