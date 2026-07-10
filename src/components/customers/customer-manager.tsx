"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Plus, Search, Trash2, Users } from "lucide-react";

import { customerDetailsSchema } from "@/domain/invoices/schemas";
import type { Customer, CustomerDetails } from "@/domain/invoices/types";
import { useCustomers } from "@/hooks/use-local-data";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const emptyCustomerForm: CustomerDetails = {
  name: "",
  address: "",
  gstNumber: "",
  phone: "",
  email: "",
};

export function CustomerManager() {
  const [query, setQuery] = useState("");
  const { customers, loading, error, repository, refresh, reset } = useCustomers(query);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<CustomerDetails>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: emptyCustomerForm,
  });

  useEffect(() => {
    if (!editing) {
      resetForm(emptyCustomerForm);
      return;
    }
    resetForm({
      name: editing.name,
      address: editing.address,
      gstNumber: editing.gstNumber,
      phone: editing.phone,
      email: editing.email,
    });
  }, [editing, resetForm]);

  async function onSubmit(form: CustomerDetails) {
    if (!repository) return;

    if (editing) {
      await repository.update(editing.id, form);
      setMessage("Customer updated.");
    } else {
      await repository.create(form);
      setMessage("Customer created.");
    }

    setEditing(null);
    resetForm(emptyCustomerForm);
    await refresh();
  }

  return (
    <div className="app-section py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-muted">Reusable billing records</p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight text-ink">
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Save GST, contact, and address details once, then pull them into invoices.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="section-panel p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong text-ink">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {editing ? "Edit customer" : "New customer"}
              </h2>
              <p className="text-sm text-muted">Details are stored in this browser.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Field
              label="Customer name"
              htmlFor="customer-name"
              error={errors.name?.message}
            >
              <Input
                id="customer-name"
                {...register("name")}
              />
            </Field>
            <Field
              label="Address"
              htmlFor="customer-address"
              error={errors.address?.message}
            >
              <Textarea
                id="customer-address"
                {...register("address")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="GST number"
                htmlFor="customer-gst"
                error={errors.gstNumber?.message}
              >
                <Input
                  id="customer-gst"
                  {...register("gstNumber")}
                />
              </Field>
              <Field label="Phone" htmlFor="customer-phone" error={errors.phone?.message}>
                <Input
                  id="customer-phone"
                  {...register("phone")}
                />
              </Field>
            </div>
            <Field label="Email" htmlFor="customer-email" error={errors.email?.message}>
              <Input
                id="customer-email"
                type="email"
                {...register("email")}
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {editing ? "Save customer" : "Add customer"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
            {message ? <p className="text-sm text-muted">{message}</p> : null}
          </form>
        </section>

        <section className="section-panel p-5 md:p-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              className="rounded-full pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by customer, GST, email, or phone"
              aria-label="Search customers"
            />
          </div>

          {error ? (
            <div className="mt-6 rounded-md border border-[#f3b4a2] bg-[#fff4f1] p-4">
              <p className="font-medium text-[#c13515]">Customer data needs attention.</p>
              <p className="mt-1 text-sm text-body">
                Stored customer records could not be read. Resetting removes only the
                corrupted local customer records.
              </p>
              <Button className="mt-4" variant="danger" onClick={() => void reset()}>
                Reset customer storage
              </Button>
            </div>
          ) : null}

          <div className="mt-6 divide-y divide-hairline-soft">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted">Loading customers...</p>
            ) : customers.length ? (
              customers.map((customer) => (
                <article
                  key={customer.id}
                  className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-ink">{customer.name}</h3>
                    <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-muted">
                      {customer.address}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {customer.gstNumber || "No GST"} - {customer.email || "No email"} -{" "}
                      {customer.phone || "No phone"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${customer.name}`}
                      onClick={() => setEditing(customer)}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${customer.name}`}
                      onClick={async () => {
                        if (!repository || !window.confirm("Delete this customer?")) return;
                        await repository.delete(customer.id);
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="font-semibold text-ink">No customers saved</p>
                <p className="mt-1 text-sm text-muted">
                  Add a customer to reuse billing details in invoices.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
